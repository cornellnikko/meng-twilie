# NOTE: This Dockerfile is for the web app only.  The crontab which runs the regular ingest of API calls and Tweets will not run on this container due to inconsistencies between Docker and NodeJS cron modeules such as node-cron.  DO NOT RUN THIS APP ON MULTI-NODE KUBERNETES OR YOU WILL HAVE RACE CONDITIONS WITH THE CRON TASK.  
FROM node:13.12-stretch

WORKDIR /home/app

ADD package.json /home/app
RUN npm install
ADD . /home/app

CMD ["npm", "start"]
