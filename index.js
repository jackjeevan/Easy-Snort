#!/usr/bin/env node

const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const { spawn } = require('child_process');

function autoSetupSnort() {
  console.log('Auto setup for Snort selected.');

  // Check if Snort is installed
  exec('snort --version', (error, stdout, stderr) => {
    if (error) {
      console.log('Snort is not installed on your machine. Installing Snort...');
      installSnort();
      copySampleConfToSnortConf();
    } else {
      console.log('Snort is already installed.');
      let snortConfPath = '';
    if (process.platform === 'win32') {
    // Windows
    snortConfPath = 'C:/Snort/etc/snort.conf';
    } else if (process.platform === 'darwin') {
    // macOS
    snortConfPath = '/opt/local/etc/snort/snort.conf';
    } else {
    snortConfPath = '/etc/snort/snort.conf';
    }
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ snortConfPath }));
    console.log(`Snort configuration path saved to ${configPath}.`);
      copySampleConfToSnortConf();
    }
  });
}

const getLinuxDistribution = () => {
  if (process.platform === 'linux') {
    if (fs.existsSync('/etc/os-release')) {
      const osReleaseContent = fs.readFileSync('/etc/os-release', 'utf8');
      const lines = osReleaseContent.split('\n');
      const distInfo = {};

      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && value && key !== '_') {
          distInfo[key.trim()] = value.trim().replace(/"/g, '');
        }
      }

      return distInfo;
    }
  }

  return null;
};

function installSnort() {
  let installCommand = '';

  if (process.platform === 'win32') {
    // Windows
    installCommand = 'choco install snort';
  } else if (process.platform === 'darwin') {
        let isMacPortsInstalled = false;
        try {
            exec('which port');
            isMacPortsInstalled = true;
        } catch (error) {
            console.log('MacPorts is not installed. Installing MacPorts...');
            // Install MacPorts
            exec('curl -O https://distfiles.macports.org/MacPorts/MacPorts-2.8.1.tar.bz2');
            exec('tar xf MacPorts-2.8.1.tar.bz2');
            exec('cd MacPorts-2.8.1 && ./configure && make && sudo make install');
            exec('cd .. && rm -rf MacPorts-2.8.1 MacPorts-2.8.1.tar.bz2');
            console.log('MacPorts installation completed.');
        }
        if (isMacPortsInstalled) {
            exec('sudo port selfupdate');
            installCommand = 'sudo port install snort';
        }
    } else if (process.platform === 'linux'){
    
	const linuxDistInfo = getLinuxDistribution();
	if (linuxDistInfo) {
	  const distName = linuxDistInfo['NAME'];
	  const distVersion = linuxDistInfo['VERSION_ID'];
	  console.log(`Detected Linux Distribution: ${distName} ${distVersion}`);

	  if (distName.includes('Debian')) {
	    installCommand = 'sudo apt-get update && sudo apt-get install -y snort';
	  }else if (distName.includes('Ubuntu')) {
    		installCommand = 'sudo apt-get update && sudo apt-get install -y snort';
  	} else if (distName.includes('Red Hat')) {
	    installCommand = 'sudo yum install -y snort';
	  } else {
	    console.log('Unsupported Linux distribution.');
	  }
	} else {
	  console.log('Not running on a Linux system.');
	}
    	}
    else {
        console.error('Unsupported operating system. Please manually install Snort.');
        process.exit(1);
    }
 if (installCommand) {
        try {
    console.log('Installing Snort...');
    execSync(installCommand, { stdio: 'inherit' });
    console.log('Snort installation completed.');
  } catch (error) {
    console.error('Error installing Snort:', error.message);
    process.exit(1);
  }
    }

    let snortConfPath = '';
    if (process.platform === 'win32') {
    snortConfPath = 'C:/Snort/etc/snort.conf';
    } else if (process.platform === 'darwin') {
    snortConfPath = '/opt/local/etc/snort/snort.conf';
    } else {
    snortConfPath = '/etc/snort/snort.conf';
    }
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ snortConfPath }));
    console.log(`Snort configuration path saved to ${configPath}.`);
}

function copySampleConfToSnortConf() {
  let sampleConfPath = '';
  const { snortConfPath } = JSON.parse(fs.readFileSync('./config.json', 'utf8')); // Replace this with the actual path to the snort.conf file on the user's machine.

  if(process.platform === 'linux')
  {
    try {
        sampleConfPath = './sample_configs/sample_linux.conf';
        exec(`sudo cp ${sampleConfPath} ${snortConfPath}`);
    } catch (error) {
        console.error('Error copying sample.conf to snort.conf:', error);
    }
  }
  else if(process.platform === 'darwin')
  {
    try {
        sampleConfPath = './sample_configs/sample_macOS.conf';
        exec(`sudo cp ${sampleConfPath} ${snortConfPath}`);
    } catch (error) {
        console.error('Error copying sample.conf to snort.conf:', error);
    }
  }
  else{
    try {
        sampleConfPath = './sample_configs/sample_win.conf';
        exec(`sudo cp ${sampleConfPath} ${snortConfPath}`);
        } catch (error) {
            console.error('Error copying sample.conf to snort.conf:', error);
        }
    }
    fs.copyFile(sampleConfPath, snortConfPath, (err) => {
        if (err) {
          console.error('Error copying sample.conf to snort.conf:', err);
        } else {
          console.log('Sample.conf copied to snort.conf successfully.');
        }
    });
}


function enableNetworkInterface(interfaceName) {
    switch (process.platform) {
      case 'linux':
      case 'darwin':
        exec(`sudo ifconfig ${interfaceName} up`, (error, stdout, stderr) => {
          if (error) {
            console.error('Error enabling network interface:', error);
          } else {
            console.log('Network interface enabled successfully.');
          }
        });
        break;
      case 'win32':
        exec(`netsh interface set interface "${interfaceName}" admin=ENABLED`, (error, stdout, stderr) => {
          if (error) {
            console.error('Error enabling network interface:', error);
          } else {
            console.log('Network interface enabled successfully.');
          }
        });
        break;
      default:
        console.error('Platform not supported.');
        break;
    }
}

async function getAllNetworkInterfaces() {
    try {
      const { stdout, stderr } = await spawnCommand('ifconfig',['-a']);
      if (stderr) {
        console.error(`Error fetching network interfaces: ${stderr}`);
        return [];
      } else {
        const interfaces = parseIfconfigOutput(stdout);
        return interfaces;
      }
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }
  
  async function getAllNetworkInterfacesWin() {
      try {
        const { stdout, stderr } = await spawnCommand('ipconfig');
        if (stderr) {
          console.error(`Error fetching network interfaces: ${stderr}`);
          return [];
        } else {
          const interfaces = parseIpconfigOutput(stdout);
          return interfaces;
        }
      } catch (error) {
        console.error('Error:', error);
        return [];
      }
    }
  
  function spawnCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
  
      let stdout = '';
      let stderr = '';
  
      process.stdout.on('data', (data) => {
        stdout += data;
      });
  
      process.stderr.on('data', (data) => {
        stderr += data;
      });
  
      process.on('error', (error) => {
        reject(error);
      });
  
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command '${command}' failed with code ${code}.`));
        }
      });
    });
  }
  
  function parseIfconfigOutput(output) {
    const lines = output.split('\n');
    const interfaces = lines.reduce((result, line) => {
      const match = line.match(/^\S+:/); 
      if (match) {
        const interfaceName = match[0].replace(':', ''); 
        result.push(interfaceName);
      }
      return result;
    }, []);
  
    return interfaces;
  }
  
  function parseIpconfigOutput(output) {
      const lines = output.split('\r\n');
      const interfaces = lines.reduce((result, line) => {
        const match = line.match(/^\s*Ethernet adapter (.+):/);
        if (match) {
          const interfaceName = match[1];
          result.push(interfaceName);
        }
        return result;
      }, []);
    
      return interfaces;
}

async function getNetworkInterfacesAll() {
    if(process.platform === 'linux' || process.platform === 'darwin')
    {
        const networkInterfaces = await getAllNetworkInterfaces();
        return networkInterfaces;
    }
    else
    {
        const networkInterfaces = await getAllNetworkInterfacesWin();
        return networkInterfaces;
    }
}

async function runSnortBlocking(interface1,interface2) {
    const { snortConfPath } = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    
    
    const snortCommand = `sudo snort -i ${interface1}:${interface2} -A console -Q -c ${snortConfPath}`;
    console.log('\n!!Press Ctrl+C to return to the menu.!!\n');
    console.log('\n!!Press Ctrl+C to return to the menu.!!\n');
    
    await new Promise(resolve => setTimeout(resolve,3000));
    
    const snortProcess = spawn(snortCommand, { shell: true, stdio: 'inherit' });
  
    snortProcess.on('close', (code) => {
	exec(`sudo ifconfig ${interface2} down`);
	main();
      	console.log(`Snort process exited with code ${code}`);
    });
}

async function blockIcmpFtpSsh() {
    console.log('Block ICMP/FTP/SSH packets selected.');
    
    const eligibleInterfaces = await getNetworkInterfacesAll();
  
    if (eligibleInterfaces.length < 2) {
      console.error('Error: Insufficient eligible network interfaces found.');
      return;
    }

    let interface1;
    let interface2;

    if(eligibleInterfaces.length === 2)
    {
        const isVirtualInterface = await inquirer.prompt({
            type: 'confirm',
            name: 'createVirtual',
            message: 'Only one eligible network interface found. Is there another virtual network interface ?',
          });
        
        if (isVirtualInterface.createVirtual) {
            const virtualInterfaceInput = await inquirer.prompt({
              type: 'input',
              name: 'virtualInterfaceName',
              message: 'Enter the name for the virtual interface (e.g., eth0:1):',
              validate: (input) => {
                return /^en|enp\d+:\d+$/.test(input) || 'Invalid virtual interface name format. Use enX:X or enpX:X.';
              },
        });
        interface1 = eligibleInterfaces[1];//[0] is lo
        interface2 = virtualInterfaceInput.virtualInterfaceName; 
        } else {
        console.error('Error: Insufficient eligible network interfaces found.');
        return;
        }
    }else{
    const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'interface1',
          message: 'Select the first interface name starting with en/enp:',
          choices: eligibleInterfaces,
        },
        {
          type: 'list',
          name: 'interface2',
          message: 'Select the second interface name starting with en/enp:',
          choices: (answers) => eligibleInterfaces.filter((name) => name !== answers.interface1),
        },
      ]);
      interface1 = answers.interface1;
      interface2 = answers.interface2;
    }
    enableNetworkInterface(interface2);
    console.log('Selected interfaces:', interface1, interface2);
    return { interface1, interface2 };
}

function getLocalNetwork(interface) {
    const interfaces = os.networkInterfaces();
    const iface = interfaces[interface];

  if (!iface || !Array.isArray(iface)) {
    return null; // Interface not found or has no addresses
  }
  const ipv4Address = iface.find((addr) => addr.family === 'IPv4');

  if (!ipv4Address) {
    return null;
  }

  const ipAddress = ipv4Address.address;
  return ipAddress.split('.').slice(0, 3).join('.');
}

function modifySnortConf(interface1, interface2) {
    const { snortConfPath } = JSON.parse(fs.readFileSync('./config.json', 'utf8')); // Replace this with the actual path to the snort.conf file on the user's machine.
  
    fs.readFile(snortConfPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading snort.conf:', err);
        return;
      }
      const modifiedData = data.replace(/ipvar HOME_NET .*/, `ipvar HOME_NET ${getLocalNetwork(interface1)}.0/24`);
      
      fs.writeFile(snortConfPath, modifiedData, 'utf8', (err) => {
        if (err) {
          console.error('Error writing to snort.conf:', err);
        } else {
          console.log('snort.conf updated successfully.');
        }
      });
      if (data.includes('config daq: afpacket') && data.includes('config daq_mode: inline')) {
        return;
      }
        const linesToAppend = ['config daq: afpacket', 'config daq_mode: inline'];
        const newConfig = `${data}\n${linesToAppend.join('\n')}\n`;
        fs.writeFile(snortConfPath, newConfig, (err) => {
            if (err) {
            console.error('Error writing to snort.conf:', err);
            } else {
            console.log('Lines appended to snort.conf.');
            }
        });
    });
}

function includeSnortRules(rules) {
    let localRulesPath = ''; // Replace this with the actual path to the local.rules file on the user's machine.
    if (process.platform === 'win32') {
        localRulesPath = 'C:/Snort/etc/rules/local.rules';
        } else if (process.platform === 'darwin') {
        localRulesPath = '/opt/local/etc/snort/rules/local.rules';
        } else {
        localRulesPath = '/etc/snort/rules/local.rules';
    }
    let rulesToInclude = '';
    if (rules.includes('ICMP')) {
      rulesToInclude += fs.readFileSync('./snort_rules/icmp.rules', 'utf8') + '\n';
    }
    if (rules.includes('FTP')) {
      rulesToInclude += fs.readFileSync('./snort_rules/ftp.rules', 'utf8') + '\n';
    }
    if (rules.includes('SSH')) {
      rulesToInclude += fs.readFileSync('./snort_rules/ssh.rules', 'utf8') + '\n';
    }
    if (rules.includes('SMB')) {
        rulesToInclude += fs.readFileSync('./snort_rules/smb.rules', 'utf8') + '\n';
    }
    fs.writeFile(localRulesPath, rulesToInclude, (err) => {
      if (err) {
        console.error('Error appending rules to local.rules:', err);
      } else {
        console.log('Rules added to local.rules successfully.');
      }
    });
}

async function main() {
      const { option } = await inquirer.prompt([
        {
          type: 'list',
          name: 'option',
          message: 'Select an option:',
          choices: ['Auto setup Snort', 'Block ICMP/FTP/SMB/SSH', 'Exit\n'],
        },
      ]);
  
      if (option === 'Auto setup Snort') {
        autoSetupSnort();
        main();
      } else if (option === 'Block ICMP/FTP/SMB/SSH') {
        try {
          const selectedInterfaces = await blockIcmpFtpSsh();
  
          const { blockedProtocols } = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'blockedProtocols',
              message: 'Select protocols to block:',
              choices: ['ICMP', 'FTP', 'SSH', 'SMB'],
            },
          ]);
  
          console.log('Selected blocked protocols:', blockedProtocols);
  
          const blockedRules = [];
          if (blockedProtocols.includes('ICMP')) {
            blockedRules.push('ICMP');
          }
          if (blockedProtocols.includes('FTP')) {
            blockedRules.push('FTP');
          }
          if (blockedProtocols.includes('SSH')) {
            blockedRules.push('SSH');
          }
          if (blockedProtocols.includes('SMB')) {
            blockedRules.push('SMB');
          }
  
          if (blockedRules.length > 0) {
            const { interface1, interface2 } = selectedInterfaces;
            modifySnortConf(interface1, interface2);
            includeSnortRules(blockedRules);
            runSnortBlocking(interface1,interface2);
          }
        } catch (error) {
          console.error('Error:', error);
        }
      } else if (option === 'Exit') {
        console.log('Exiting...');
        process.exit(0);
      }
  }

main().catch((error) => {
    console.error('Error:', error);
});