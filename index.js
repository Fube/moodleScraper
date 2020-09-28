require('dotenv').config();
const puppeteer = require('puppeteer');
const readline = require('readline');
const rl = readline.createInterface(process.stdin, process.stdout);
(async () => {
    console.log(
        'STARTED LOADING\nIF YOU GET 2 EMPTY ARRAYS, RESTART THE PROGRAM\nIF IT TAKES LONGER THAN 5 MINUTES, RESTART THE PROGRAM'
    );
    const browser = await puppeteer.launch({
        headless: !!process.env.SHOW,
        defaultViewport: null,
        executablePath: './chromium/chrome.exe',
    });
    const page = await browser.newPage();
    await page.goto(
        'https://champlaincollege-st-lambert.moodle.decclic.qc.ca/login/index.php'
    );

    await page.type('#username', process.env.USER);
    await page.type('#password', process.env.PASS);

    await Promise.all([
        page.click('#loginbtn'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    const links = await page.evaluate(
        eval(
            `() => ([...document.querySelectorAll('#page-container-3 > div > div > div > a')].map(({ href }) => href))`
        )
    );

    console.log('\nGETTING ASSIGNMENTS AND EXAMS');
    const allAssignments = [],
        allExams = [];
    for (const link of links) {
        const page = await browser.newPage();
        await page.goto(link);

        const assignmentLinks = await page.evaluate(
            eval(
                `() => [...document.querySelectorAll('a')].filter(({ href: h }) => /.*\\/mod\\/assign.*/.test(h)).map(({ href: h }) => h)`
            )
        );
        const examLinks = await page.evaluate(
            eval(
                `() => [...document.querySelectorAll('a')].filter(({ href: h }) => /.*\\/mod\\/quiz.*/.test(h)).map(({ href: h }) => h)`
            )
        );

        allExams.push(...(await getExams(page, examLinks)));
        allAssignments.push(...(await getAssignments(page, assignmentLinks)));
    }

    const upcomingLabs = allAssignments.filter(
        ({ dueDate }) => new Date(dueDate) - new Date() > 0
    );
    const upcomingExams = allExams.filter(
        ({ dueDate }) => new Date(dueDate) - new Date() > 0
    );

    console.log('\n\nUPCOMING LABS\n\n');
    console.log(upcomingLabs);
    console.log('\n\nUPCOMING EXAMS\n\n');
    console.log(upcomingExams);
    console.log('\n\nPRESS ENTER TO EXIT');

    await browser.close();
    rl.on('line', () => process.exit(0));
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
async function getExams(page, examLinks) {
    const toRet = [];

    for (const examLink of examLinks) {
        await page.goto(examLink);
        const [courseName, examName, dueDate] = await Promise.all([
            getText(
                page,
                '/html/body/div[1]/div[3]/header/div/div/div/div[1]/div[1]/div/div/h1'
            ),
            getText(
                page,
                '/html/body/div[1]/div[3]/div/div/section/div[1]/div/div/h2'
            ),
            page.evaluate(
                eval(
                    `() =>document.querySelector('.box.py-3.quizinfo').innerHTML.match(/This quiz.*on (.*)</)[1]`
                )
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
    // const toRet = await page.evaluate(
    //     eval(`(element) => element.textContent,element`)
    // );
    const toRet = await element.getProperty('textContent');

    return toRet._remoteObject.value.match(regex)[0];
}
