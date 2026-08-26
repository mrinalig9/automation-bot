import { chromium } from "playwright";

async function main () {
    // launch browser - headless: false means that the browser will be visible
    const browser = await chromium.launch({headless: false});

    //open a fresh page
    const page = await browser.newPage();

    //navigate to url
    await page.goto("https://the-internet.herokuapp.com/login");

    //grab page title for confirmation
    const title = await page.title();
    console.log("Page loaded. Title: ", title);

    //pause for 3 seconds to see the page
    await page.waitForTimeout(3000);

    //close browser
    await browser.close();
}

main();