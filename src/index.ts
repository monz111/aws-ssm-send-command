import AWS, { AWSError } from "aws-sdk";
import * as core from "@actions/core";
import { SendCommandResult } from "aws-sdk/clients/ssm";

try {
  const inputs = SanitizeInputs();

  // AWS Configure
  AWS.config.update({
    accessKeyId: inputs.accessKeyId,
    secretAccessKey: inputs.secretAccessKey,
    region: inputs.region,
  });

  // Run Send Command
  const ssm = new AWS.SSM();
  ssm.sendCommand();
  ssm.sendCommand(
    {
      InstanceIds: inputs.instanceIds,
      DocumentName: inputs.documentName,
      Comment: inputs.comment,
      Parameters: {
        workingDirectory: [inputs.workingDirectory],
        commands: [inputs.command],
      },
    },
    async (err: AWSError, data: SendCommandResult) => {
      if (err || !data.Command?.CommandId) throw err;

      const CommandId =  data.Command.CommandId
      const checks = new Array(inputs.checkStatusLimit).fill(1)

      for (const InstanceId of inputs.instanceIds) {
            for (const _ of checks) {
                await new Promise(resolve => setTimeout(resolve, inputs.checkStatusFrequency * 1000))
                const invocation = await ssm.getCommandInvocation({ CommandId, InstanceId }).promise()
                if (invocation.Status === 'Failed') {
                    core.setOutput("contents", invocation.StandardOutputContent);
                    core.setOutput("error-contents", invocation.StandardErrorContent);
                    core.setFailed('Faild')
                    break
                }
                else if (invocation.Status === 'Success') {
                    core.setOutput("contents", invocation.StandardOutputContent);
                    core.setOutput("error-contents", invocation.StandardErrorContent);
                    break
                }
            }
      }

      console.log(data);

      core.setOutput("command-id", CommandId);
    }
  );
} catch (err) {
  console.error(err, err.stack);
  core.setFailed(err);
}

function SanitizeInputs() {
  // AWS
  const _accessKeyId = core.getInput("aws-access-key-id", { required: true });
  const _secretAccessKey = core.getInput("aws-secret-access-key", {
    required: true,
  });
  const _region = core.getInput("aws-region", { required: true });

  // SSM Send Command
  const _instanceIds = core.getInput("instance-ids", { required: true });
  const _command = core.getInput("command");
  const _workingDirectory = core.getInput("working-directory");
  const _comment = core.getInput("comment");
  const _checkStatusLimit = core.getInput("check-status-limit");
  const _checkStatusFrequency = core.getInput("check-status-frequency");

  // customized not supported yet, will be updated soon.
  const _documentName = "AWS-RunShellScript";

  return {
    accessKeyId: _accessKeyId,
    secretAccessKey: _secretAccessKey,
    region: _region,
    instanceIds: _instanceIds.split(/\n/),
    command: _command,
    documentName: _documentName,
    workingDirectory: _workingDirectory,
    comment: _comment,
    checkStatusLimit: +_checkStatusLimit || 0,
    checkStatusFrequency: +_checkStatusFrequency || 1
  };
}
