require("dotenv").config();
const puppeteer = require("puppeteer");
const readline = require("readline");

const pastDateFilter = ({ dueDate }) => new Date(dueDate) - new Date() > 0;

const rl = readline.createInterface(process.stdin, process.stdout);
(async function () {
    console.log(
        "STARTED LOADING\nIF IT TAKES LONGER THAN 5 MINUTES, RESTART THE PROGRAM"
    );

    const browser = await puppeteer.launch({
        headless: process.env.SHOW && process.env.SHOW == "false",
        defaultViewport: null,
    });
    const page = await browser.newPage();
    await page.goto(
        "https://champlaincollege-st-lambert.moodle.decclic.qc.ca/login/index.php"
    );

    await Promise.all([
        page.waitForNavigation(),
        page.waitForSelector("#username"),
        page.waitForSelector("#password"),
        page.waitForSelector("#loginbtn"),
    ]);

    await page.type("#username", process.env.MOODLE_USERNAME);
    await page.type("#password", process.env.MOODLE_PASSWORD);

    await Promise.all([
        page.click("#loginbtn"),
        page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);

    const links = new Set(
        await page.$$eval(
            `.card-deck.dashboard-card-deck[data-region] > [data-course-id] > a`,
            (n) => n.map((x) => x.getAttribute("href"))
        )
    );

    const allAssignments = [],
        allExams = [];
    for (const link of links) {
        console.log(`Loading ${link}`);
        const page = await browser.newPage();
        await page.goto(link);

        const assignmentLinks = await page.$$eval("a[href]", (n) =>
            n
                .filter((x) =>
                    x.getAttribute("href").toString().includes("mod/assign")
                )
                .map((x) => x.getAttribute("href"))
        );

        const examLinks = await page.$$eval("a[href]", (n) =>
            n
                .filter((x) =>
                    x.getAttribute("href").toString().includes("mod/quiz")
                )
                .map((x) => x.getAttribute("href"))
        );

        allExams.push(...(await getExams(page, examLinks)));
        allAssignments.push(...(await getAssignments(page, assignmentLinks)));
    }

    if (allAssignments.length === 0) {
        console.log("LOGIN FAILED! TRYING AGAIN");
        await browser.close();
        arguments.callee();
        return;
    }
    console.log("\nGETTING ASSIGNMENTS AND EXAMS");

    const upcomingLabs = allAssignments.filter(pastDateFilter);
    const upcomingExams = allExams.filter(pastDateFilter);

    console.log("\n\nUPCOMING LABS\n\n");
    console.log(upcomingLabs);
    console.log("\n\nUPCOMING EXAMS\n\n");
    console.log(upcomingExams);
    console.log("\n\nPRESS ENTER TO EXIT");

    await browser.close();
    rl.on("line", () => process.exit(0));
})();

async function getAssignments(page, assignmentLinks) {
    const toRet = [];

    for (const assignmentLink of assignmentLinks) {
        await page.goto(assignmentLink);
        const [courseName, assignmentName, dueDate] = await Promise.all([
            getText(
                page,
                '//*[@id="page-header"]/div/div/div/div[1]/div[1]/div/div/h1'
            ),
            getText(page, '//*[@id="region-main"]/div[1]/div/div/h2'),
            getText(
                page,
                '//*[@id="region-main"]/div[1]/div/div/div[2]/div[1]/table/tbody/tr[3]/td'
            ),
        ]);
        toRet.push({
            courseName,
            assignmentName,
            dueDate,
        });
    }

    return toRet;
}

/**
 *
 * @param {import("puppeteer").Page} page
 * @param {string[]} examLinks
 * @returns
 */
async function getExams(page, examLinks) {
    const toRet = [];

    for (const examLink of examLinks) {
        await page.goto(examLink);
        const [courseName, examName, dueDate] = await Promise.all([
            getText(
                page,
                "/html/body/div[1]/div[3]/header/div/div/div/div[1]/div[1]/div/div/h1"
            ),
            getText(
                page,
                "/html/body/div[1]/div[3]/div/div/section/div[1]/div/div/h2"
            ),
            page.$eval(
                ".box.py-3.quizinfo",
                (n) => n.innerHTML.match(/This quiz.*on (.*)</)[1]
            ),
        ]);
        toRet.push({
            courseName,
            examName,
            dueDate,
        });
    }

    return toRet;
}
async function getText(page, xpath, regex = /.*/g) {
    const [element] = await page.$x(xpath);
    if (!element) return;
    const toRet = await element.getProperty("textContent");

    return toRet._remoteObject.value.match(regex)[0];
}
