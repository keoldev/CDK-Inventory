import { CfnWebACLProps } from "aws-cdk-lib/aws-wafv2";

export const wafWebACLApigatewayProps: CfnWebACLProps = {
    defaultAction: {
        allow: {},
    },
    scope: 'REGIONAL',
    visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'webACL',
        sampledRequestsEnabled: true
    },
    rules: [{
        name: 'AWS-AWSManagedRulesBotControlRuleSet',
        overrideAction: {
            none: {}
        },
        priority: 0,
        statement: {
            managedRuleGroupStatement: {
                name: 'AWSManagedRulesBotControlRuleSet',
                vendorName: 'AWS'
            },
        },
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesBotControlRuleSet',
            sampledRequestsEnabled: true
        }
    },
    {
        name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
        overrideAction: {
            none: {}
        },
        priority: 1,
        statement: {
            managedRuleGroupStatement: {
                name: 'AWSManagedRulesKnownBadInputsRuleSet',
                vendorName: 'AWS'
            },
        },
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesKnownBadInputsRuleSet',
            sampledRequestsEnabled: true
        }
    },
    {
        name: 'AWS-AWSManagedRulesCommonRuleSet',
        overrideAction: {
            none: {}
        },
        priority: 2,
        statement: {
            managedRuleGroupStatement: {
                name: 'AWSManagedRulesCommonRuleSet',
                vendorName: 'AWS',
                excludedRules: [{
                    name: "SizeRestrictions_BODY"
                }]
            },
        },
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
            sampledRequestsEnabled: true
        }
    },
    {
        name: 'AWS-AWSManagedRulesAnonymousIpList',
        overrideAction: {
            none: {}
        },
        priority: 3,
        statement: {
            managedRuleGroupStatement: {
                name: 'AWSManagedRulesAnonymousIpList',
                vendorName: 'AWS'
            },
        },
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesAnonymousIpList',
            sampledRequestsEnabled: true
        }
    },
    {
        name: 'AWS-AWSManagedRulesAmazonIpReputationList',
        overrideAction: {
            none: {}
        },
        priority: 4,
        statement: {
            managedRuleGroupStatement: {
                name: 'AWSManagedRulesAmazonIpReputationList',
                vendorName: 'AWS'
            },
        },
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesAmazonIpReputationList',
            sampledRequestsEnabled: true
        }
    },
    {
        name: 'AWS-AWSManagedRulesAdminProtectionRuleSet',
        overrideAction: {
            none: {}
        },
        priority: 5,
        statement: {
            managedRuleGroupStatement: {
                name: 'AWSManagedRulesAdminProtectionRuleSet',
                vendorName: 'AWS'
            },
        },
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesAdminProtectionRuleSet',
            sampledRequestsEnabled: true
        }
    },
    {
        name: 'AWS-AWSManagedRulesSQLiRuleSet',
        overrideAction: {
            none: {}
        },
        priority: 6,
        statement: {
            managedRuleGroupStatement: {
                name: 'AWSManagedRulesSQLiRuleSet',
                vendorName: 'AWS'
            },
        },
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesSQLiRuleSet',
            sampledRequestsEnabled: true
        }
    }]
}
