# Start here

This folder is the project. The code, the plan, the briefs and the session reports all live here.

## 1. Install (once)

In PowerShell:

1. Check Node: `node -v`. You need version 20 or newer. If not, install the LTS from nodejs.org.
2. Check Git: `git --version`. If it fails, install Git for Windows (git-scm.com).
3. Install Claude Code: `irm https://claude.ai/install.ps1 | iex`, then close and reopen PowerShell and check `claude --version`.

## 2. Open the project

```powershell
cd C:\Users\fatna\AOTN
git init
claude
```

## 3. First message to Claude Code

> Read CLAUDE.md, docs/PLAN.md and docs/briefs/session-1.md, then carry out session 1. Ask me for each environment value when you reach the step that needs it.

## 4. Meanwhile, by hand

- **Supabase**: new project at supabase.com, region closest to Tunisia (Frankfurt or Paris). Copy the URL, the anon key and the service role key from Project Settings, API.
- **GitHub**: new private repository `rupturewatch`. Push when Claude Code asks.
- **Vercel**: import the GitHub repository, add the same environment values.
- **Meta**: developers.facebook.com, create an app, add the WhatsApp product, note the test number, the phone number ID, a token and the app secret. Add your phone and your teammates' as test recipients (up to 5).
- **Domain**: buy one and point it at Vercel. Not blocking.
- **Survey**: publish the pharmacist form from the field kit in Drive and send the share messages.
- **Testers**: book 3 to 5 pharmacists for 15 minutes on Monday evening or Tuesday morning.

## 5. When the session ends

Its report is written to `docs/reports/session-1.md`. Tell me in the chat, with two screenshots of the home page (phone width and laptop width). I read the report and the code here, then write the session 2 brief.
