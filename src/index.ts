import { chromium } from "playwright";

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

    //click start to trigger delayed content
    await page.click("#start button");
    console.log("Clicked start button, waiting for delayed content");

    //wait for hidden element to appear
    await page.waitForSelector("#finish");

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