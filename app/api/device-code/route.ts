import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { spawn } from 'child_process';

const execPromise = promisify(exec);

async function checkSfCliVersion() {
  try {
    const { stdout, stderr } = await execPromise('sf -v');
    if (stderr) {
      throw new Error('Error checking SF CLI version');
    }
    return stdout.trim();
  } catch (error) {
    throw new Error('Salesforce CLI is not installed or accessible: ' + error.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    //const { alias } = await req.json();
    const alias = "sohan";
    
    if (!alias) {
      return NextResponse.json({ error: 'Alias is required' }, { status: 400 });
    }

    const versionInfo = await checkSfCliVersion();
    console.log('Salesforce CLI Version:', versionInfo);

    const childProcess = spawn('sf', ['org', 'login', 'device', '--instance-url', 'https://test.salesforce.com/', '--alias', alias]);

    let output = '';

    childProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    const killTimeout = setTimeout(() => {
      if (!childProcess.killed) {
        childProcess.kill();
        console.log('Process killed after timeout');
      }
    }, 5000);

    return new Promise<NextResponse>((resolve) => {
      childProcess.on('close', () => {
        clearTimeout(killTimeout);

        try {
          const deviceCodeIndex = output.indexOf('Enter') + 6;
          const deviceCodeEnd = output.indexOf('device code');
          const verificationUrlIndex = output.indexOf('URL:') + 5;

          const deviceCode = output.substring(deviceCodeIndex, deviceCodeEnd).trim();
          const verificationUrl = output.substring(verificationUrlIndex).split('\n')[0].trim();

          if (deviceCode && verificationUrl) {
            resolve(NextResponse.json({
              output,
              deviceCode,
              verificationUrl,
            }));
          } else {
            resolve(NextResponse.json({
              success: false,
              message: 'Could not extract device code or verification URL',
              fullOutput: output
            }, { status: 500 }));
          }
        } catch (error) {
          resolve(NextResponse.json({
            success: false,
            message: 'Error parsing output',
            fullOutput: output
          }, { status: 500 }));
        }
      });

      childProcess.on('error', (error) => {
        resolve(NextResponse.json({
          success: false,
          message: error.message,
          fullOutput: output
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message,
      details: error.stderr || error.stdout
    }, { status: 500 });
  }
}
