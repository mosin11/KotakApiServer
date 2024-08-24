@echo off

REM Initialize a new Git repository
git init

REM Add all files to the staging area
git add .

REM Commit the changes
git commit -m "option chain detail added"

REM Rename the default branch to 'main'
git branch -M main

REM Add remote repositories
git remote add origin https://github.com/mosin11/KotakApiServer.git

REM Push changes to the remote repository
git push -u origin main

REM Run npm predeploy
REM npm run predeploy

REM Run npm deploy
REM npm run deploy

