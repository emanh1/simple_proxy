import { getBodyBuffer } from '@/utils/body';
import {
  getProxyHeaders,
  getAfterResponseHeaders,
  getBlacklistedHeaders,
} from '@/utils/headers';
import {
  createTokenIfNeeded,
  isAllowedToMakeRequest,
  setTokenHeader,
} from '@/utils/turnstile';
import { specificProxyRequest } from '~/utils/proxy';
import { sendJson } from '~/utils/sending';
import puppeteer from 'puppeteer';

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({ headless: true });
    console.log('Puppeteer initialized');
  }
  return browser;
}

export default defineEventHandler(async (event) => {
  // Handle preflight CORS requests
  if (isPreflightRequest(event)) {
    handleCors(event, {});
    // Ensure the response ends here for preflight
    event.node.res.statusCode = 204;
    event.node.res.end();
    return;
  }

  // Reject any other OPTIONS requests
  if (event.node.req.method === 'OPTIONS') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    });
  }

  // Parse destination URL
  const destination = getQuery<{ destination?: string }>(event).destination;
  const useBrowser = getHeader(event, 'x-use-browser') === 'true';
  // const { destination, useBrowser } = getQuery<{destination?: string, useBrowser?: string}>(event);
  if (!destination) {
    return await sendJson({
      event,
      status: 200,
      data: {
        message: `Proxy is working as expected (v${useRuntimeConfig(event).version
          })`,
      },
    });
  }

  // Check if allowed to make the request
  if (!(await isAllowedToMakeRequest(event))) {
    return await sendJson({
      event,
      status: 401,
      data: {
        error: 'Invalid or missing token',
      },
    });
  }

  if (useBrowser === true) {
    let page = null;
    try {
      const allowedWaitUntil = ['networkidle2', 'domcontentloaded'];

      const waitUntil = getHeader(event, 'x-browser-wait-until') ?? 'networkidle2';

      if (!allowedWaitUntil.includes(waitUntil)) {
        return await sendJson({
          event,
          status: 400,
          data: {
            error: `Invalid waitUntil, only ${allowedWaitUntil.join(', ')}`
          }
        })
      }
      
      const timeoutStr = getHeader(event, 'x-browser-timeout');
      const timeout = timeoutStr && /^\d+$/.test(timeoutStr) ? parseInt(timeoutStr) : 30000;

      const browser = await getBrowser();
      page = await browser.newPage();

      await page.goto(destination, { 
        waitUntil: waitUntil as 'networkidle2' | 'domcontentloaded',
        timeout
      });

      const content = await page.content();

      await page.close();

      event.node.res.setHeader('Access-Control-Allow-Origin', '*');
      event.node.res.setHeader('Content-Type', 'text/html');
      event.node.res.setHeader('X-Proxy-Mode', 'browser');

      event.node.res.end(content);

      return;
    } catch (error) {
      if (page) await page.close();
      event.node.res.statusCode = 504;
      event.node.res.setHeader('Content-Type', 'application/json');
      event.node.res.end(JSON.stringify({
        error: 'Puppeteer failed or timed out.',
      }));
      return;
    }
  }
  // Read body and create token if needed
  const body = await getBodyBuffer(event);
  const token = await createTokenIfNeeded(event);

  // Proxy the request
  try {
    await specificProxyRequest(event, destination, {
      blacklistedHeaders: getBlacklistedHeaders(),
      fetchOptions: {
        redirect: 'follow',
        headers: getProxyHeaders(event.headers),
        body,
      },
      onResponse(outputEvent, response) {
        const headers = getAfterResponseHeaders(response.headers, response.url);
        setResponseHeaders(outputEvent, headers);
        if (token) setTokenHeader(event, token);
      },
    });
  } catch (e) {
    console.log('Error fetching', e);
    throw e;
  }
});