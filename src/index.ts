import { chromium } from "playwright";

/** 
 * runs an async operation w retries and exponential backoff
 * @param operation - the async function to attempt
 * @param label - label for logging
 * @param maxAttempts - maximum number of retries
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    label: string,
    maxAttempts: number = 3
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            //attempt the operation. if successful, return the result immediately.
            const result = await operation();
            if (attempt > 1) {
                console.log(`${label} succeeded on attempt ${attempt}`);
            }
            return result;
        } catch (error) {
            lastError = error;
            console.log(`[${label}] Attempt ${attempt} failed.`);

            // if we still have attempts left, wait with exponential backoff.
            if (attempt < maxAttempts) {
                const backoffMs = 1000 * Math.pow(2, attempt - 1); // backoff: 1s, 2s, 4s
                console.log(`[${label}] Retrying in ${backoffMs}ms...`);
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }
        }
    }

    // all attempts failed
    throw new Error(`[${label}] Failed after ${maxAttempts} attempts. Last error: ${lastError}`);

}

async function main () {
    // launch browser + open page
    const browser = await chromium.launch({headless: false});
    const page = await browser.newPage();

    //login
    await page.goto("https://the-internet.herokuapp.com/login");
    await page.fill("#username", "tomsmith");
    await page.fill("#password", "SuperSecretPassword!");
    await page.click("button[type='submit']");
    await page.waitForSelector("text=Secure Area");
    console.log("Login successful");

    //navigate to "Dynamic Loading" page
    await page.goto("https://the-internet.herokuapp.com/dynamic_loading/1");

    //click start to trigger delayed content, with retry
    await withRetry(
        () => page.click("#start button"),
        "Click Start Button"
    );
    console.log("Clicked start button, waiting for delayed content");

    //wait for hidden element to appear, with retry
    await withRetry(
        () => page.waitForSelector("#finish"),
        "Wait for Delayed Content"
    );

    //extract text from the element
    const resultText = await page.textContent("#finish");
    console.log("Extracted:", resultText);

    //save as structured json
    const result = {
        task: "Dynamic_loading",
        extractedText: resultText?.trim(),
        timestamp: new Date().toISOString(),
        status: "success",
    };

    console.log("Structured JSON:", JSON.stringify(result, null, 2));

    await browser.close();
}

main();

