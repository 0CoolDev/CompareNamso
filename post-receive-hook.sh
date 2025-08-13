#!/bin/bash

# Git post-receive hook for automatic CardGenius deployment
# Place this in your bare repository's hooks directory as 'post-receive'

while read oldrev newrev refname; do
    # Only deploy when pushing to main/master branch
    if [[ "$refname" == "refs/heads/main" ]] || [[ "$refname" == "refs/heads/master" ]]; then
        echo "Deploying CardGenius application..."
        
        # SSH into the server and run the update script
        ssh -p 9922 nulladmin@95.217.132.221 "/opt/cardgenius/update-cardgenius.sh"
        
        if [ $? -eq 0 ]; then
            echo "Deployment successful!"
        else
            echo "Deployment failed! Check server logs for details."
            exit 1
        fi
    else
        echo "Push received for $refname - skipping deployment (only main/master triggers deployment)"
    fi
done
