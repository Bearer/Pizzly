#!/bin/bash
pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

INTEGRATION=$1
TEMP_DIRECTORY=tmp-run-integration-template-tests
RUN_TEST=$2

if [ ! -d "./integration-templates/$INTEGRATION/mocks" ]; then
    echo "No mocks found for $INTEGRATION"
    exit 0
fi

rm -rf $TEMP_DIRECTORY
mkdir -p $TEMP_DIRECTORY/nango-integrations
cp -r integration-templates/$INTEGRATION $TEMP_DIRECTORY/nango-integrations

mv $TEMP_DIRECTORY/nango-integrations/$INTEGRATION/nango.yaml $TEMP_DIRECTORY/nango-integrations/nango.yaml

# new tests will be generated
if [ -d $TEMP_DIRECTORY/nango-integrations/$INTEGRATION/tests ]; then
    rm -rf $TEMP_DIRECTORY/nango-integrations/$INTEGRATION/tests
fi
[ -f $TEMP_DIRECTORY/nango-integrations/*.ts ] && mv $TEMP_DIRECTORY/nango-integrations/*.ts $TEMP_DIRECTORY/nango-integrations/$INTEGRATION/

export NANGO_CLI_UPGRADE_MODE=ignore

pushd $TEMP_DIRECTORY/nango-integrations
npx nango generate
popd

cp -r $TEMP_DIRECTORY/nango-integrations ./packages/integration-template-tests/nango-integrations
pushd ./packages/integration-template-tests
npm run generate

if [ "$RUN_TEST" = "true" ]; then
    npm run test
fi

# keep tests around for posterity
cp -r nango-integrations/$INTEGRATION/tests ../../integration-templates/$INTEGRATION

rm -rf nango-integrations
popd
rm -rf $TEMP_DIRECTORY
