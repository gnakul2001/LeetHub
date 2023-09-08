/* Enum for languages supported by LeetCode. */
const languages = {
  Python: '.py',
  Python3: '.py',
  'C++': '.cpp',
  C: '.c',
  Java: '.java',
  'C#': '.cs',
  JavaScript: '.js',
  Javascript: '.js',
  Ruby: '.rb',
  Swift: '.swift',
  Go: '.go',
  Kotlin: '.kt',
  Scala: '.scala',
  Rust: '.rs',
  PHP: '.php',
  TypeScript: '.ts',
  MySQL: '.sql',
  'MS SQL Server': '.sql',
  Oracle: '.sql',
};

/* Commit messages */
const readmeMsg = 'Create README - LeetHub';
const discussionMsg = 'Prepend discussion post - LeetHub';
const createNotesMsg = 'Attach NOTES - LeetHub';

// problem types
const NORMAL_PROBLEM = 0;
const EXPLORE_SECTION_PROBLEM = 1;

/* Difficulty of most recenty submitted question */
let difficulty = '';

// Save Prob Statement in start for Mid UI
let probStatement = null;

// Save Prob Title in start for Mid UI
let probTitle = null;

/* state of upload for progress */
let uploadState = { uploading: false };

/* Get file extension for submission */
function findLanguage() {
  const tag = [
    ...document.getElementsByClassName(
      'ant-select-selection-selected-value',
    ),
    ...[document.querySelector('#editor button[id^="headlessui-listbox-button"][type="button"][aria-haspopup="true"]')],
    ...[document.querySelector('#editor button[id^="headlessui-popover-button"]')],
    ...document.getElementsByClassName('Select-value-label'),
  ];
  if (tag && tag.length > 0) {
    for (let i = 0; i < tag.length; i += 1) {
      const elem = tag[i] ? tag[i].textContent : undefined;
      if (elem !== undefined && languages[elem] !== undefined) {
        return languages[elem]; // should generate respective file extension
      }
    }
  }
  return null;
}

/* Main function for uploading code to GitHub repo, and callback cb is called if success */
const upload = (
  token,
  hook,
  code,
  directory,
  filename,
  sha,
  msg,
  cb = undefined,
) => {
  // To validate user, load user object from GitHub.
  const URL = `https://api.github.com/repos/${hook}/contents/${directory}/${filename}`;

  /* Define Payload */
  let data = {
    message: msg,
    content: code,
    sha,
  };

  data = JSON.stringify(data);

  const xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200 || xhr.status === 201) {
        const updatedSha = JSON.parse(xhr.responseText).content.sha; // get updated SHA.

        chrome.storage.local.get('stats', (data2) => {
          let { stats } = data2;
          if (stats === null || stats === {} || stats === undefined) {
            // create stats object
            stats = {};
            stats.solved = 0;
            stats.easy = 0;
            stats.medium = 0;
            stats.hard = 0;
            stats.sha = {};
          }
          const filePath = directory + filename;
          // Only increment solved problems statistics once
          // New submission commits twice (README and problem)
          if (filename === 'README.md' && sha === null) {
            stats.solved += 1;
            stats.easy += difficulty === 'Easy' ? 1 : 0;
            stats.medium += difficulty === 'Medium' ? 1 : 0;
            stats.hard += difficulty === 'Hard' ? 1 : 0;
          }
          stats.sha[filePath] = updatedSha; // update sha key.
          chrome.storage.local.set({ stats }, () => {
            console.log(
              `Successfully committed ${filename} to github`,
            );

            // if callback is defined, call it
            if (cb !== undefined) {
              cb();
            }
          });
        });
      }
    }
  });
  xhr.open('PUT', URL, true);
  xhr.setRequestHeader('Authorization', `token ${token}`);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  xhr.send(data);
};

/* Main function for updating code on GitHub Repo */
/* Currently only used for prepending discussion posts to README */
/* callback cb is called on success if it is defined */
const update = (
  token,
  hook,
  addition,
  directory,
  msg,
  prepend,
  cb = undefined,
) => {
  const URL = `https://api.github.com/repos/${hook}/contents/${directory}/README.md`;

  /* Read from existing file on GitHub */
  const xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200 || xhr.status === 201) {
        const response = JSON.parse(xhr.responseText);
        const existingContent = decodeURIComponent(
          escape(atob(response.content)),
        );
        let newContent = '';

        /* Discussion posts prepended at top of README */
        /* Future implementations may require appending to bottom of file */
        if (prepend) {
          newContent = btoa(
            decodeURIComponent(encodeURIComponent(addition + existingContent)),
          );
        }

        /* Write file with new content to GitHub */
        upload(
          token,
          hook,
          newContent,
          directory,
          'README.md',
          response.sha,
          msg,
          cb,
        );
      }
    }
  });
  xhr.open('GET', URL, true);
  xhr.setRequestHeader('Authorization', `token ${token}`);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  xhr.send();
};

function uploadGit(
  code,
  problemName,
  fileName,
  msg,
  action,
  prepend = true,
  cb = undefined,
  _diff = undefined,
) {
  // Assign difficulty
  if (_diff && _diff !== undefined) {
    difficulty = _diff.trim();
  }

  /* Get necessary payload data */
  chrome.storage.local.get('leethub_token', (t) => {
    const token = t.leethub_token;
    if (token) {
      chrome.storage.local.get('mode_type', (m) => {
        const mode = m.mode_type;
        if (mode === 'commit') {
          /* Get hook */
          chrome.storage.local.get('leethub_hook', (h) => {
            const hook = h.leethub_hook;
            if (hook) {
              /* Get SHA, if it exists */

              /* to get unique key */
              const filePath = problemName + fileName;
              chrome.storage.local.get('stats', (s) => {
                const { stats } = s;
                let sha = null;

                if (
                  stats !== undefined &&
                  stats.sha !== undefined &&
                  stats.sha[filePath] !== undefined
                ) {
                  sha = stats.sha[filePath];
                }

                if (action === 'upload') {
                  /* Upload to git. */
                  upload(
                    token,
                    hook,
                    code,
                    problemName,
                    fileName,
                    sha,
                    msg,
                    cb,
                  );
                } else if (action === 'update') {
                  /* Update on git */
                  update(
                    token,
                    hook,
                    code,
                    problemName,
                    msg,
                    prepend,
                    cb,
                  );
                }
              });
            }
          });
        }
      });
    }
  });
}

function getCSRFToken() {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return null; // CSRF token not found
}

function getLCSession() {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'LEETCODE_SESSION') {
      return value;
    }
  }
  return null; // SESSION not found
}

/* Function for finding and parsing the full code. */
/* - At first find the submission details url. */
/* - Then send a request for the details page. */
/* - Finally, parse the code from the html reponse. */
/* - Also call the callback if available when upload is success */
function findCode(
  uploadGit,
  problemName,
  fileName,
  msg,
  action,
  cb = undefined,
) {
  /* Get the submission details url from the submission page. */
  var submissionURL;
  const submissionRef = document.getElementById('result-state');
  if (submissionRef) {
    // for a submission in explore section
    submissionURL = submissionRef?.href;
  } else {
    // for normal problem submisson
    let lcVersion = getLCVersion();
    const LC_HOST = 'https://leetcode.com';
    switch (lcVersion) {
      case 1: // Old UI
        const e = document.getElementsByClassName('status-column__3SUg');
        const submissionRef = e[1].innerHTML.split(' ')[1];
        submissionURL = LC_HOST + submissionRef.split('=')[1].slice(1, -1);
        break;
      case 2: // Mid UI
      case 3: // Latest UI
        // successTag = document.querySelectorAll('[data-e2e-locator="submission-result"]');
        // if (
        //   checkElem(successTag) &&
        //   successTag[0].innerText.toLowerCase().trim() === 'accepted'
        // ) {
        //   successTag = successTag[0];
        //   success = true;
        //   probType = NORMAL_PROBLEM;
        // }
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://leetcode.com/graphql/");
        xhr.setRequestHeader("accept", "*/*");
        xhr.setRequestHeader("accept-language", "en-GB,en-US;q=0.9,en;q=0.8,da;q=0.7");
        xhr.setRequestHeader("authorization", "");
        xhr.setRequestHeader("content-type", "application/json");
        // xhr.setRequestHeader("random-uuid", "458f6f47-6b4a-9e64-d461-1f75341b6f04");
        // xhr.setRequestHeader("sec-ch-ua", "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Google Chrome\";v=\"116\"");
        // xhr.setRequestHeader("sec-ch-ua-mobile", "?0");
        // xhr.setRequestHeader("sec-ch-ua-platform", "\"macOS\"");
        // xhr.setRequestHeader("sec-fetch-dest", "empty");
        // xhr.setRequestHeader("sec-fetch-mode", "cors");
        // xhr.setRequestHeader("sec-fetch-site", "same-origin");
        xhr.setRequestHeader("uuuserid", "b7e83af2f93a347aeb3237a3067d1812");
        xhr.setRequestHeader("x-csrftoken", getCSRFToken());
        xhr.setRequestHeader("x-lc-session", getLCSession());
        // xhr.setRequestHeader("Cookie", "LEETCODE_SESSION=" + getLCSession());
        // xhr.withCredentials = true;
        // xhr.setRequestHeader("cookie", "gr_user_id=e1ea923e-41d2-4d09-9656-c859cd6730b6; csrftoken=JX319ETo6LxxjvLJMMgANhYg8WKCPGmGceQv2sMa7R5pgzmEHwlCeAdaprFyzMAY; LEETCODE_SESSION=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhY2NvdW50X3ZlcmlmaWVkX2VtYWlsIjpudWxsLCJhY2NvdW50X3VzZXIiOiI2OTFyNCIsIl9hdXRoX3VzZXJfaWQiOiIxMDQ5OTg3MiIsIl9hdXRoX3VzZXJfYmFja2VuZCI6ImFsbGF1dGguYWNjb3VudC5hdXRoX2JhY2tlbmRzLkF1dGhlbnRpY2F0aW9uQmFja2VuZCIsIl9hdXRoX3VzZXJfaGFzaCI6IjViYTI3ODM2OWYxNWNjNjM5ZTIyMTNiNmRhMjFiZjEzYmM4NTQ3MmUiLCJpZCI6MTA0OTk4NzIsImVtYWlsIjoibmFrdWxndXB0YTEwNDJAZ21haWwuY29tIiwidXNlcm5hbWUiOiJuYWt1bGd1cHRhMTA0MiIsInVzZXJfc2x1ZyI6Im5ha3VsZ3VwdGExMDQyIiwiYXZhdGFyIjoiaHR0cHM6Ly9zMy11cy13ZXN0LTEuYW1hem9uYXdzLmNvbS9zMy1sYy11cGxvYWQvYXNzZXRzL2RlZmF1bHRfYXZhdGFyLmpwZyIsInJlZnJlc2hlZF9hdCI6MTY5MzQ2NDQ0OSwiaXAiOiIxMDMuNDkuMTE2LjIwMiIsImlkZW50aXR5IjoiMTJjZmY3YzQwMWIyNDE1ODFjMWYzNDdlY2U3MzU0M2QiLCJzZXNzaW9uX2lkIjo0NDgwNjA0NX0.6FHQQUoWaefq5wCqHsOTzXH2D1LAynIOHyESIm6GGwg; _gid=GA1.2.2047285222.1693464450; __stripe_mid=1241ebb8-136d-468c-b2eb-f739d0155d57b0ac54; NEW_PROBLEMLIST_PAGE=1; 87b5a3c3f1a55520_gr_session_id=45f58fea-1bb3-413a-b9c4-9950e36a7035; 87b5a3c3f1a55520_gr_session_id_sent_vst=45f58fea-1bb3-413a-b9c4-9950e36a7035; c_a_u=\"bmFrdWxndXB0YTEwNDI=:1qbfbs:ypQ3GfVropqaM1Eki4QEJAsb6lE\"; _gat=1; _ga=GA1.1.1073715618.1692693324; _dd_s=rum=0&expire=1693482306800; _ga_CDRWKZTDEX=GS1.1.1693474873.3.1.1693481406.50.0.0");
        // xhr.setRequestHeader("Referer", "https://leetcode.com/problems/add-two-numbers/submissions/");
        // xhr.setRequestHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status === 200) {
            console.log(xhr.responseText);
          }
        };

        var data = {
          query: `
            query submissionList($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!, $lang: Int, $status: Int) {
              questionSubmissionList(
                offset: $offset
                limit: $limit
                lastKey: $lastKey
                questionSlug: $questionSlug
                lang: $lang
                status: $status
              ) {
                lastKey
                hasNext
                submissions {
                  id
                  title
                  titleSlug
                  status
                  statusDisplay
                  lang
                  langName
                  runtime
                  timestamp
                  url
                  isPending
                  memory
                  hasNotes
                  notes
                  flagType
                  topicTags {
                    id
                  }
                }
              }
            }
          `,
          variables: {
            questionSlug: "add-two-numbers",
            offset: 0,
            limit: 20,
            lastKey: null,
            lang: 0,
            status: 0
          },
          operationName: "submissionList"
        };

        xhr.send(JSON.stringify(data));
        return;
        break;
      default:
        console.log("Unknown LC Version");
        return;
    }
  }

  if (submissionURL != undefined) {
    /* Request for the submission details page */
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        /* received submission details as html reponse. */
        var doc = new DOMParser().parseFromString(
          this.responseText,
          'text/html',
        );
        /* the response has a js object called pageData. */
        /* Pagedata has the details data with code about that submission */
        var scripts = doc.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
          var text = scripts[i].innerText;
          if (text.includes('pageData')) {
            /* Considering the pageData as text and extract the substring
            which has the full code */
            var firstIndex = text.indexOf('submissionCode');
            var lastIndex = text.indexOf('editCodeUrl');
            var slicedText = text.slice(firstIndex, lastIndex);
            /* slicedText has code as like as. (submissionCode: 'Details code'). */
            /* So finding the index of first and last single inverted coma. */
            var firstInverted = slicedText.indexOf("'");
            var lastInverted = slicedText.lastIndexOf("'");
            /* Extract only the code */
            var codeUnicoded = slicedText.slice(
              firstInverted + 1,
              lastInverted,
            );
            /* The code has some unicode. Replacing all unicode with actual characters */
            var code = codeUnicoded.replace(
              /\\u[\dA-F]{4}/gi,
              function (match) {
                return String.fromCharCode(
                  parseInt(match.replace(/\\u/g, ''), 16),
                );
              },
            );

            /*
            for a submisssion in explore section we do not get probStat beforehand
            so, parse statistics from submisson page
            */
            if (!msg) {
              slicedText = text.slice(
                text.indexOf('runtime'),
                text.indexOf('memory'),
              );
              const resultRuntime = slicedText.slice(
                slicedText.indexOf("'") + 1,
                slicedText.lastIndexOf("'"),
              );
              slicedText = text.slice(
                text.indexOf('memory'),
                text.indexOf('total_correct'),
              );
              const resultMemory = slicedText.slice(
                slicedText.indexOf("'") + 1,
                slicedText.lastIndexOf("'"),
              );
              msg = `Time: ${resultRuntime}, Memory: ${resultMemory} - LeetHub`;
            }

            if (code != null) {
              setTimeout(function () {
                uploadGit(
                  btoa(decodeURIComponent(encodeURIComponent(code))),
                  problemName,
                  fileName,
                  msg,
                  action,
                  true,
                  cb,
                );
              }, 2000);
            }
          }
        }
      }
    };

    xhttp.open('GET', submissionURL, true);
    xhttp.send();
  }
}

/* Main parser function for the code */
function parseCode() {
  const e = document.getElementsByClassName('CodeMirror-code');
  if (e !== undefined && e.length > 0) {
    const elem = e[0];
    let parsedCode = '';
    const textArr = elem.innerText.split('\n');
    for (let i = 1; i < textArr.length; i += 2) {
      parsedCode += `${textArr[i]}\n`;
    }
    return parsedCode;
  }
  return null;
}

/* Util function to check if an element exists */
function checkElem(elem) {
  return elem && elem.length > 0;
}
function convertToSlug(string) {
  const a =
    'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b =
    'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return string
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}
function getProblemNameSlug() {
  let questionTitle = getProbTitle();
  return addLeadingZeros(convertToSlug(questionTitle));
}

function addLeadingZeros(title) {
  const maxTitlePrefixLength = 4;
  var len = title.split('-')[0].length;
  if (len < maxTitlePrefixLength) {
    return '0'.repeat(4 - len) + title;
  }
  return title;
}

function getProbTitle() {
  if (probTitle) return probTitle;
  const questionDescriptionElem = document.getElementsByClassName(
    'question-description__3U1T',
  );
  if (checkElem(questionDescriptionElem)) {
    let questionTitle = document.getElementsByClassName(
      'question-title',
    );
    if (checkElem(questionTitle)) {
      questionTitle = questionTitle[0].innerText;
    } else {
      questionTitle = 'unknown-problem';
    }
    return questionTitle;
  } else {
    let lcVersion = getLCVersion();
    let qtitle = null;
    switch (lcVersion) {
      case 1: // Old UI
        questionElem = document.getElementsByClassName(
          'content__u3I1 question-content__JfgR',
        );
        if (checkElem(questionElem)) {
          // Problem title.
          qtitle = document.getElementsByClassName('css-v3d350');
          if (checkElem(qtitle)) {
            qtitle = qtitle[0].innerHTML;
          } else {
            qtitle = 'unknown-problem';
          }
        }
        break;
      case 2: // Mid UI
        questionElem = document.querySelectorAll('[data-track-load="description_content"]');
        if (checkElem(questionElem)) {
          // Problem title.
          qtitle = document.getElementsByClassName('mr-2 text-label-1 hover:text-label-1 text-lg font-medium');
          if (checkElem(qtitle)) {
            qtitle = qtitle[0].textContent;
          } else {
            qtitle = 'unknown-problem';
          }
        }
        break;
      case 3: // Latest UI
        questionElem = document.querySelectorAll('[data-track-load="description_content"]');
        if (checkElem(questionElem)) {
          // Problem title.
          qtitle = document.getElementsByClassName('text-title-large font-semibold text-text-primary');
          if (checkElem(qtitle)) {
            qtitle = qtitle[0].textContent;
          } else {
            qtitle = 'unknown-problem';
          }
        }
        break;
      default:
        console.log("Unknown LC Version");
        return null;
    }
    return qtitle;
  }
}

/* Parser function for the question and tags */
function parseQuestion() {
  if (probStatement) return probStatement;
  var questionUrl = window.location.href;
  if (questionUrl.endsWith('/submissions/')) {
    questionUrl = questionUrl.substring(
      0,
      questionUrl.lastIndexOf('/submissions/') + 1,
    );
  }
  let markdown = null;
  const questionDescriptionElem = document.getElementsByClassName(
    'question-description__3U1T',
  );
  if (checkElem(questionDescriptionElem)) {
    let questionTitle = getProbTitle();

    const questionBody = questionDescriptionElem[0].innerHTML;
    markdown = `<h2>${questionTitle}</h2><hr>${questionBody}`;
  } else {
    let lcVersion = getLCVersion();
    let qbody = null;
    let qtitle = getProbTitle();
    let questionElem = null;
    switch (lcVersion) {
      case 1: // Old UI
        questionElem = document.getElementsByClassName(
          'content__u3I1 question-content__JfgR',
        );
        if (checkElem(questionElem)) {
          qbody = questionElem[0].innerHTML;

          // Problem difficulty, each problem difficulty has its own class.
          const isHard = document.getElementsByClassName('css-t42afm');
          const isMedium = document.getElementsByClassName('css-dcmtd5');
          const isEasy = document.getElementsByClassName('css-14oi08n');

          if (checkElem(isEasy)) {
            difficulty = 'Easy';
          } else if (checkElem(isMedium)) {
            difficulty = 'Medium';
          } else if (checkElem(isHard)) {
            difficulty = 'Hard';
          }
        }
        break;
      case 2: // Mid UI
        questionElem = document.querySelectorAll('[data-track-load="description_content"]');
        if (checkElem(questionElem)) {
          qbody = questionElem[0].innerHTML;

          // Problem difficulty, each problem difficulty has its own class.
          const difficultyStatus = document.querySelectorAll('.text-pink.inline-block.text-sm.font-medium.capitalize.leading-\\[22px\\], .text-yellow.inline-block.text-sm.font-medium.capitalize.leading-\\[22px\\], .text-olive.inline-block.text-sm.font-medium.capitalize.leading-\\[22px\\]');

          if (checkElem(difficultyStatus)) {
            difficulty = difficultyStatus[0].textContent;
          }
        }
        break;
      case 3: // Latest UI
        questionElem = document.querySelectorAll('[data-track-load="description_content"]');
        if (checkElem(questionElem)) {
          qbody = questionElem[0].innerHTML;

          // Problem difficulty, each problem difficulty has its own class.
          const difficultyStatus = document.querySelectorAll('[class^="text-difficulty-"]');

          if (checkElem(difficultyStatus)) {
            difficulty = difficultyStatus[0].textContent;
          }
        }
        break;
      default:
        console.log("Unknown LC Version");
        return null;
    }
    if (qtitle == null) return null;
    // Final formatting of the contents of the README for each problem
    markdown = `<h2><a href="${questionUrl}">${qtitle}</a></h2><h3>${difficulty}</h3><hr>${qbody}`;
  }
  return markdown;
}

/* Parser function for time/space stats */
function parseStats() {
  let time = null;
  let timePercentile = null;
  let space = null;
  let spacePercentile = null;
  let probStats;
  let lcVersion = getLCVersion();
  switch (lcVersion) {
    case 1: // Old UI
      probStats = document.getElementsByClassName('data__HC-i');
      if (!checkElem(probStats)) {
        return null;
      }
      time = probStats[0].textContent;
      timePercentile = probStats[1].textContent;
      space = probStats[2].textContent;
      spacePercentile = probStats[3].textContent;
      break;
    case 2: // Mid UI
      probStats = document.querySelectorAll(".mr-1.text-lg.font-semibold.leading-\\[22px\\].text-label-1.dark\\:text-dark-label-1");
      if (!checkElem(probStats)) return null;

      if (probStats.length > 0 && probStats[0].parentNode) {
        time = probStats[0].parentNode.textContent;

        const parentOfTimeStats = probStats[0].parentNode.parentNode;
        timePercentile = parentOfTimeStats
          ? parentOfTimeStats.querySelector('div:last-child')?.querySelector('span:first-child')?.textContent?.replace("Beats ", "")
          : "";
      }

      if (probStats.length > 1 && probStats[1].parentNode) {
        space = probStats[1].parentNode.textContent;

        const parentOfSpaceStats = probStats[1].parentNode.parentNode;
        spacePercentile = parentOfSpaceStats
          ? parentOfSpaceStats.querySelector('div:last-child')?.querySelector('span:first-child')?.textContent?.replace("Beats ", "")
          : "";
      }
      break;
    case 3: // Latest UI
      break;
    default:
      console.log("Unknown LC Version");
      return null;
  }
  // Format commit message
  return `Time: ${time} (${timePercentile}), Space: ${space} (${spacePercentile}) - LeetHub`;
}

document.addEventListener('click', (event) => {
  const element = event.target;
  const oldPath = window.location.pathname;

  /* Act on Post button click */
  /* Complex since "New" button shares many of the same properties as "Post button */
  if (
    element.classList.contains('icon__3Su4') ||
    element.parentElement.classList.contains('icon__3Su4') ||
    element.parentElement.classList.contains(
      'btn-content-container__214G',
    ) ||
    element.parentElement.classList.contains('header-right__2UzF')
  ) {
    setTimeout(function () {
      /* Only post if post button was clicked and url changed */
      if (
        oldPath !== window.location.pathname &&
        oldPath ===
        window.location.pathname.substring(0, oldPath.length) &&
        !Number.isNaN(window.location.pathname.charAt(oldPath.length))
      ) {
        const date = new Date();
        const currentDate = `${date.getDate()}/${date.getMonth()}/${date.getFullYear()} at ${date.getHours()}:${date.getMinutes()}`;
        const addition = `[Discussion Post (created on ${currentDate})](${window.location})  \n`;
        const problemName = window.location.pathname.split('/')[2]; // must be true.

        uploadGit(
          addition,
          problemName,
          'README.md',
          discussionMsg,
          'update',
        );
      }
    }, 1000);
  }
});

/* function to get the notes if there is any
 the note should be opened atleast once for this to work
 this is because the dom is populated after data is fetched by opening the note */
function getNotesIfAny() {
  // there are no notes on expore
  if (document.URL.startsWith('https://leetcode.com/explore/'))
    return '';

  notes = '';
  if (
    checkElem(document.getElementsByClassName('notewrap__eHkN')) &&
    checkElem(
      document
        .getElementsByClassName('notewrap__eHkN')[0]
        .getElementsByClassName('CodeMirror-code'),
    )
  ) {
    notesdiv = document
      .getElementsByClassName('notewrap__eHkN')[0]
      .getElementsByClassName('CodeMirror-code')[0];
    if (notesdiv) {
      for (i = 0; i < notesdiv.childNodes.length; i++) {
        if (notesdiv.childNodes[i].childNodes.length == 0) continue;
        text = notesdiv.childNodes[i].childNodes[0].innerText;
        if (text) {
          notes = `${notes}\n${text.trim()}`.trim();
        }
      }
    }
  }
  return notes.trim();
}

const getLCVersion = () => {
  const reactRootElement = document.getElementById('app');
  if (reactRootElement) {
    // Old UI
    return 1;
  } else {
    // Check New Version UI Versions
    const element = document.querySelector('#qd-content .flexlayout__layout');
    if (element) {
      // Latest UI
      return 3;
    } else {
      // Mid UI
      return 2;
    }
  }
};

const loader = setInterval(() => {
  let code = null;
  let title = getProbTitle();
  let statement = parseQuestion();
  if (title) probTitle = title;
  if (statement) probStatement = statement;
  if (!probStatement || !probTitle) return;
  let probStats = null;
  let probType = null;

  var success = false;
  let successTag = null;
  const resultState = document.getElementById('result-state');
  if (resultState &&
    resultState.className === 'text-success' &&
    resultState.innerText === 'Accepted') {

    // check success state for a explore section problem
    success = true;
    probType = EXPLORE_SECTION_PROBLEM;
  } else {
    // check success tag for a normal problem
    let lcVersion = getLCVersion();
    switch (lcVersion) {
      case 1: // Old UI
        successTag = document.getElementsByClassName('success__3Ai7');
        if (
          checkElem(successTag) &&
          successTag[0].className === 'success__3Ai7' &&
          successTag[0].innerText.toLowerCase().trim() === 'success'
        ) {
          successTag = successTag[0];
          success = true;
          probType = NORMAL_PROBLEM;
        }
        break;
      case 2: // Mid UI
      case 3: // Latest UI
        successTag = document.querySelectorAll('[data-e2e-locator="submission-result"]');
        if (
          checkElem(successTag) &&
          successTag[0].innerText.toLowerCase().trim() === 'accepted'
        ) {
          successTag = successTag[0];
          success = true;
          probType = NORMAL_PROBLEM;
        }
        break;
      default:
        console.log("Unknown LC Version");
        return;
    }
  }

  if (probStatement !== null && success) {
    probStats = parseStats();
    if (probStats === null && probType === NORMAL_PROBLEM) probStats = getProbTitle();
    switch (probType) {
      case NORMAL_PROBLEM:
        if (successTag) successTag.classList.add('marked_as_success');
        break;
      case EXPLORE_SECTION_PROBLEM:
        if (resultState) resultState.classList.add('marked_as_success');
        break;
      default:
        console.error(`Unknown problem type ${probType}`);
        return;
    }

    const problemName = getProblemNameSlug();
    const language = findLanguage();
    if (language !== null) {
      // start upload indicator here
      startUpload();
      chrome.storage.local.get('stats', (s) => {
        const { stats } = s;
        const filePath = problemName + problemName + language;
        let sha = null;
        if (
          stats !== undefined &&
          stats.sha !== undefined &&
          stats.sha[filePath] !== undefined
        ) {
          sha = stats.sha[filePath];
        }

        /* Only create README if not already created */
        if (sha === null) {
          /* @TODO: Change this setTimeout to Promise */
          uploadGit(
            btoa(decodeURIComponent(encodeURIComponent(probStatement))),
            problemName,
            'README.md',
            readmeMsg,
            'upload',
          );
        }
      });

      /* get the notes and upload it */
      /* only upload notes if there is any */
      notes = getNotesIfAny();
      if (notes.length > 0) {
        setTimeout(function () {
          if (notes != undefined && notes.length != 0) {
            console.log('Create Notes');
            // means we can upload the notes too
            uploadGit(
              btoa(decodeURIComponent(encodeURIComponent(notes))),
              problemName,
              'NOTES.md',
              createNotesMsg,
              'upload',
            );
          }
        }, 500);
      }

      /* Upload code to Git */
      setTimeout(function () {
        findCode(
          uploadGit,
          problemName,
          problemName + language,
          probStats,
          'upload',
          // callback is called when the code upload to git is a success
          () => {
            if (uploadState['countdown'])
              clearTimeout(uploadState['countdown']);
            delete uploadState['countdown'];
            uploadState.uploading = false;
            markUploaded();
          },
        ); // Encode `code` to base64
      }, 1000);
    }
  }
}, 1000);

/* Since we dont yet have callbacks/promises that helps to find out if things went bad */
/* we will start 10 seconds counter and even after that upload is not complete, then we conclude its failed */
function startUploadCountDown() {
  uploadState.uploading = true;
  uploadState['countdown'] = setTimeout(() => {
    if ((uploadState.uploading = true)) {
      // still uploading, then it failed
      uploadState.uploading = false;
      markUploadFailed();
    }
  }, 10000);
}

/* we will need specific anchor element that is specific to the page you are in Eg. Explore */
function insertToAnchorElement(elem) {
  if (document.URL.startsWith('https://leetcode.com/explore/')) {
    // means we are in explore page
    action = document.getElementsByClassName('action');
    if (
      checkElem(action) &&
      checkElem(action[0].getElementsByClassName('row')) &&
      checkElem(
        action[0]
          .getElementsByClassName('row')[0]
          .getElementsByClassName('col-sm-6'),
      ) &&
      action[0]
        .getElementsByClassName('row')[0]
        .getElementsByClassName('col-sm-6').length > 1
    ) {
      target = action[0]
        .getElementsByClassName('row')[0]
        .getElementsByClassName('col-sm-6')[1];
      elem.className = 'pull-left';
      if (target.childNodes.length > 0)
        target.childNodes[0].prepend(elem);
    }
  } else {
    if (checkElem(document.getElementsByClassName('action__38Xc'))) {
      target = document.getElementsByClassName('action__38Xc')[0];
      elem.className = 'runcode-wrapper__8rXm';
      if (target.childNodes.length > 0)
        target.childNodes[0].prepend(elem);
    }
  }
}

/* start upload will inject a spinner on left side to the "Run Code" button */
function startUpload() {
  try {
    elem = document.getElementById('leethub_progress_anchor_element');
    if (!elem) {
      elem = document.createElement('span');
      elem.id = 'leethub_progress_anchor_element';
      elem.style = 'margin-right: 20px;padding-top: 2px;';
    }
    elem.innerHTML = `<div id="leethub_progress_elem" class="leethub_progress"></div>`;
    target = insertToAnchorElement(elem);
    // start the countdown
    startUploadCountDown();
  } catch (error) {
    // generic exception handler for time being so that existing feature doesnt break but
    // error gets logged
    console.log(error);
  }
}

/* This will create a tick mark before "Run Code" button signalling LeetHub has done its job */
function markUploaded() {
  elem = document.getElementById('leethub_progress_elem');
  if (elem) {
    elem.className = '';
    style =
      'display: inline-block;transform: rotate(45deg);height:24px;width:12px;border-bottom:7px solid #78b13f;border-right:7px solid #78b13f;';
    elem.style = style;
  }
}

/* This will create a failed tick mark before "Run Code" button signalling that upload failed */
function markUploadFailed() {
  elem = document.getElementById('leethub_progress_elem');
  if (elem) {
    elem.className = '';
    style =
      'display: inline-block;transform: rotate(45deg);height:24px;width:12px;border-bottom:7px solid red;border-right:7px solid red;';
    elem.style = style;
  }
}

/* Sync to local storage */
chrome.storage.local.get('isSync', (data) => {
  keys = [
    'leethub_token',
    'leethub_username',
    'pipe_leethub',
    'stats',
    'leethub_hook',
    'mode_type',
  ];
  if (!data || !data.isSync) {
    keys.forEach((key) => {
      chrome.storage.sync.get(key, (data) => {
        chrome.storage.local.set({ [key]: data[key] });
      });
    });
    chrome.storage.local.set({ isSync: true }, (data) => {
      console.log('LeetHub Synced to local values');
    });
  } else {
    console.log('LeetHub Local storage already synced!');
  }
});

// inject the style
injectStyle();

/* inject css style required for the upload progress feature */
function injectStyle() {
  const style = document.createElement('style');
  style.textContent =
    '.leethub_progress {pointer-events: none;width: 2.0em;height: 2.0em;border: 0.4em solid transparent;border-color: #eee;border-top-color: #3E67EC;border-radius: 50%;animation: loadingspin 1s linear infinite;} @keyframes loadingspin { 100% { transform: rotate(360deg) }}';
  document.head.append(style);
}
