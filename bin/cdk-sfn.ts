#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkSfnStack } from '../lib/cdk-sfn-stack';

const app = new cdk.App();
new CdkSfnStack(app, 'CdkSfnStack');
