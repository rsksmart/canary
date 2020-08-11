
# Fork detector notifier

The present script periodically checks forks detected by armadillo monitor in order to notify of any suspicious activity.

Since one-block reorganizations are common in the RSK network, the length to trigger the notifications is set to 3 blocks minimum. Anything below that is ignored.

## Set up
**``npm install``**

## Run
``npm run-script start``
