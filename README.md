# Moodle Scraper
## Because I cannot be bothered to navigate through every course every day just to check if I have an upcoming assignment or exam

#### How to install

clone the repo
<br/>
download [Chromium](https://www.chromium.org/getting-involved/download-chromium)
<br/>
put it in a folder called "chromium" in the same folder as the executable
<br/>
#### OR IF YOU HAVE NODEJS INSTALLED
run `npm i` to get the dependencies
<br/>
copy the Chromium folder found in node_modules\puppeteer\.local-chromium\win64-NUMBERS_HERE
<br/>
paste it in a folder called "chromium" in the same folder as the executable
<br/>
#### How to set up the .env file
Creeate a nameless file with the extension `.env`
<br/>
open the file and put in your student id as USER and your moodle password as PASS
<br/>
Example
```env
USER=123456
PASS=8wnsd9
```
