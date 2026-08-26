import { chromium } from "playwright";

async function main () {
    // launch browser - headless: false means that the browser will be visible
    const browser = await chromium.launch({headless: false});

    //open a fresh page
    const page = await browser.newPage();

    //go to login page
    await page.goto("https://the-internet.herokuapp.com/login");

    //fill in username
    await page.fill("#username", "tomsmith");

    //fill in password
    await page.fill("#password", "SuperSecretPassword!");

    //click submit
    await page.click("button[type='submit']");

    //wait for page to load and confirm login was successful
    await page.waitForSelector("text=Secure Area");
    console.log("Login successful");

    //pause to see, then close the browser
    await page.waitForTimeout(3000);
    await browser.close();
}

main();