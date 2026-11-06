##  Working with this repo
- When asked to fix or implement something, just make the change. Do not start dev servers, run the app, or write scripts to verify the UI/behavior yourself — the user handles testing themselves. DO NOT RUN any commands including any docker commands, without explicit permissions.

- When you are given a prompt, don't assume the user knows best. Use your best understanding to discern whether whatever prompt given makes sense for this project. Flag if it doesn't

- In development, focus on fixing the code. Unless explicitly told, don't try to fix the already generated data.

- The sign-off on the lab report (Requested By, Done By, Approved By, at the foot of the last page) must not be changed, moved or removed unless the user specifically asks for that. A request about alignment, layout or styling is not permission to change it. If a task seems to need a change to it, ask first. It lives in backend/laboratory/templates/labtestresult_signoff.html and backend/laboratory/tests/test_report_signoff.py guards it: if those tests fail, restore the sign-off rather than editing the tests.

- Locally, we run the backend using C:\client_projects\proto-type\easymed\docker-compose-local.yml. So if you need to run any commands to validate or test, use docker exec