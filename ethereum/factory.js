import web3 from './web3';
import CampaignFactory from './build/CampaignFactory.json';

const instance = new web3.eth.Contract(
  JSON.parse(CampaignFactory.interface),
  '0xa3827b528b1d96a34369657e512cc7bf8d39c7f8'
);

export default instance;
