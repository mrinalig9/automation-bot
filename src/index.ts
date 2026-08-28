import { chromium } from "playwright";
import * as fs from "fs";

// Log levels
 type LogLevel = "INFO" | "WARN" | "ERROR";

/**
 * prints a timestamped, leveled, and formatted log message
 * @param level - info for general messages, warn for recoverable issues, error for failures
 * @param message - what happened
 */

function log (level: LogLevel, message:string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
}

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
                log("INFO", `${label} succeeded on attempt ${attempt}`);
            }
            return result;
        } catch (error) {
            lastError = error;
            log("WARN", `[${label}] Attempt ${attempt} failed.`);

            // if we still have attempts left, wait with exponential backoff.
            if (attempt < maxAttempts) {
                const backoffMs = 1000 * Math.pow(2, attempt - 1); // backoff: 1s, 2s, 4s
                log("WARN", `[${label}] Retrying in ${backoffMs}ms...`);
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }
        }
    }

    // all attempts failed
    log("ERROR", `[${label}] Failed after ${maxAttempts} attempts. Last error: ${lastError}`);
    throw new Error(`[${label}] Failed after ${maxAttempts} attempts. Last error: ${lastError}`);

}

async function main () {
    const startTime = Date.now(); // record start time
    // launch browser + open page
    const browser = await chromium.launch({headless: false});
    const page = await browser.newPage();

    let status: "success"| "failure" = "failure"; // assume failure until proven otherwise

    try {
        //login
        await page.goto("https://the-internet.herokuapp.com/login");
        await page.fill("#username", "tomsmith");
        await page.fill("#password", "SuperSecretPassword!");
        await page.click("button[type='submit']");
        await page.waitForSelector("text=Secure Area");
        log("INFO", "Login successful");

        //navigate to "Dynamic Loading" page
        await page.goto("https://the-internet.herokuapp.com/dynamic_loading/1");

        //click start to trigger delayed content, with retry
        await withRetry(
            () => page.click("#start button", { timeout: 5000 }),
            "Click Start Button"
        );
        log("INFO", "Clicked start button, waiting for delayed content");

        //wait for hidden element to appear, with retry
        await withRetry(
            () => page.waitForSelector("#finish", { timeout: 5000 }),
            "Wait for Delayed Content"
        );

        //extract text from the element
        const resultText = await page.textContent("#finish");
        log("INFO", `Extracted: ${resultText}`);

        //save as structured json
        const result = {
            task: "Dynamic_loading",
            extractedText: resultText?.trim(),
            timestamp: new Date().toISOString(),
            status: "success",
        };

        log("INFO", `JSON: ${JSON.stringify(result, null, 2)}`);
        status = "success"; // mark success if all steps completed without throwing
        fs.writeFileSync("output.json", JSON.stringify(result, null, 2));
        log("INFO", "Result saved to output.json");
    }
    catch (error) {
        log("ERROR", `Run failed: ${error}`);
        // capture screenshot for debugging, wrapped in case screenshot fails
        try {
            await page.screenshot({ path: "failure.png"});
            log("INFO", "Screenshot captured: failure.png");
        } catch {
            log("WARN", "Failed to capture screenshot");
        }
    } finally {
    await browser.close();
    const elapsedTime = (Date.now() - startTime);
    log("INFO", `Run summary — status: ${status}, total time: ${elapsedTime}ms`);
    }
}

main();

