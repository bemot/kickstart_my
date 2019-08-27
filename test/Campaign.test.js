//imho all test file is better to keep in one directory, as test directory
//for testing we need assert module (definitely)
const assert = require('assert');
//Ganache CLI, part of the Truffle suite of Ethereum development tools, 
//is the command line version of Ganache, your personal blockchain for Ethereum development. 
const ganache = require('ganache-cli');
//remember that Web3 is class we need to create instance of the class
const Web3 = require('web3');
// creating instance of the class Web3
const web3 = new Web3(ganache.provider());

const compiledFactory = require('../ethereum/build/CampaignFactory.json');
const compiledCampaign = require('../ethereum/build/Campaign.json');

// accounts which exist on the network
let accounts;
//deployed instance of the factory
let factory;
//campaign address on the network
let campaignAddress;
// just campaign on the network
let campaign; //creating instance of the campaign
// we have to be sure to mark it as async
beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
    //here we are deploying our contract
    //we need parser to convert json to object for deploy function
    //web3.eth.Contract creates idea of the contract, we need
    //to deploy it and actually send to the ethereum network
    factory = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
    .deploy({ data: compiledFactory.bytecode })
    .send({ from: accounts[0], gas: '1000000' });
    //we are passing minimum contribution which will be need to join the campaign (100 wais)
    //We created a factory, now inside of factory we will create a campaign. 
    await factory.methods.createCampaign('100').send({
    from: accounts[0],
    gas: '1000000'
  });

    // we are receiving an array of addresses with deployed contracts  
    // ES2016 we may use fancy feature [campaignAddress] it will say to
    // factory.methods.getDeployedCampaigns() to return first member of the array
    // of addresses of the deployed contracts
  [campaignAddress] = await factory.methods.getDeployedCampaigns().call();
  campaign = await new web3.eth.Contract(
    JSON.parse(compiledCampaign.interface),
    campaignAddress
  );
});

describe('Campaigns', () => {
  it('deploys a factory and a campaign', () => {
    assert.ok(factory.options.address);
    assert.ok(campaign.options.address);
  });

  it('marks caller as the campaign manager', async () => {
    const manager = await campaign.methods.manager().call();
    assert.equal(accounts[0], manager);
  });

  it('allows people to contribute money and marks them as approvers', async () => {
    await campaign.methods.contribute().send({
      value: '200',
      from: accounts[1]
    });
    const isContributor = await campaign.methods.approvers(accounts[1]).call();
    assert(isContributor);
  });

  it('requires a minimum contribution', async () => {
    try {
      await campaign.methods.contribute().send({
        value: '5',
        from: accounts[1]
      });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it('allows a manager to make a payment request', async () => {
    await campaign.methods
      .createRequest('Buy batteries', '100', accounts[1])
      .send({
        from: accounts[0],
        gas: '1000000'
      });
    const request = await campaign.methods.requests(0).call();

    assert.equal('Buy batteries', request.description);
  });

  it('processes requests', async () => {
    await campaign.methods.contribute().send({
      from: accounts[0],
      value: web3.utils.toWei('10', 'ether')
    });

    await campaign.methods
      .createRequest('A', web3.utils.toWei('5', 'ether'), accounts[1])
      .send({ from: accounts[0], gas: '1000000' });

    await campaign.methods.approveRequest(0).send({
      from: accounts[0],
      gas: '1000000'
    });

    await campaign.methods.finalizeRequest(0).send({
      from: accounts[0],
      gas: '1000000'
    });

    let balance = await web3.eth.getBalance(accounts[1]);
    balance = web3.utils.fromWei(balance, 'ether');
    balance = parseFloat(balance);

    assert(balance > 104);
  });
});
