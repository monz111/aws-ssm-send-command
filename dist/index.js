"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const core = __importStar(require("@actions/core"));
try {
    const inputs = SanitizeInputs();
    // AWS Configure
    aws_sdk_1.default.config.update({
        accessKeyId: inputs.accessKeyId,
        secretAccessKey: inputs.secretAccessKey,
        region: inputs.region,
    });
    // Run Send Command
    const ssm = new aws_sdk_1.default.SSM();
    ssm.sendCommand();
    ssm.sendCommand({
        InstanceIds: inputs.instanceIds,
        DocumentName: inputs.documentName,
        Comment: inputs.comment,
        Parameters: {
            workingDirectory: [inputs.workingDirectory],
            commands: [inputs.command],
        },
    }, (err, data) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (err || !((_a = data.Command) === null || _a === void 0 ? void 0 : _a.CommandId))
            throw err;
        const CommandId = data.Command.CommandId;
        const checks = new Array(inputs.checkStatusLimit).fill(1);
        for (const InstanceId of inputs.instanceIds) {
            for (const _ of checks) {
                yield new Promise(resolve => setTimeout(resolve, inputs.checkStatusFrequency * 1000));
                const invocation = yield ssm.getCommandInvocation({ CommandId, InstanceId }).promise();
                if (invocation.Status === 'Failed') {
                    core.setFailed('Faild');
                    break;
                }
                else if (invocation.Status === 'Success') {
                    core.setOutput("output-contents", invocation);
                    break;
                }
                console.log(invocation);
            }
        }
        console.log(data);
        core.setOutput("command-id", CommandId);
    }));
}
catch (err) {
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
