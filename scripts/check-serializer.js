#!/usr/bin/env node
// Compares vendor/hive-tx's bytes with the node's own serialization of every operation, using
// condenser_api.get_transaction_hex. Read-only: nothing here signs or broadcasts.
// Run with --write to refresh the fixture that `npm test` checks offline.
const fs = require('fs');
const path = require('path');
const ByteBuffer = require('bytebuffer');
const { PrivateKey, Transaction, config } = require('../vendor/hive-tx');
const serializer = require('../vendor/hive-tx/helpers/serializer');

const FIXTURE = path.join(__dirname, '../src/__tests__/chain/serializer.fixture.json');

const key = (role) => PrivateKey.fromLogin('fixture', 'not-a-real-password', role).createPublic().toString();
const authority = (role) => ({ weight_threshold: 1, account_auths: [['pixa.team', 1]], key_auths: [[key(role), 1]] });
const A = 'pixtopia';
const B = 'pixa.team';
const when = '2026-12-01T00:00:00';

const samples = {
  vote: { voter: A, author: B, permlink: 'p-1', weight: 7500 },
  comment: { parent_author: '', parent_permlink: 'art', author: A, permlink: 'p-1', title: 'T', body: 'B', json_metadata: '{}' },
  transfer: { from: A, to: B, amount: '1.234 PIXA', memo: 'm' },
  transfer_to_vesting: { from: A, to: B, amount: '2.500 PIXA' },
  withdraw_vesting: { account: A, vesting_shares: '3.000000 VESTS' },
  limit_order_create: { owner: A, orderid: 7, amount_to_sell: '1.000 PIXA', min_to_receive: '2.000 PXS', fill_or_kill: true, expiration: when },
  limit_order_cancel: { owner: A, orderid: 7 },
  feed_publish: { publisher: A, exchange_rate: { base: '1.000 PXS', quote: '51.000 PIXA' } },
  convert: { owner: A, requestid: 9, amount: '4.000 PXS' },
  account_create: { fee: '3.000 PIXA', creator: A, new_account_name: 'newacct', owner: authority('owner'), active: authority('active'), posting: authority('posting'), memo_key: key('memo'), json_metadata: '{}' },
  account_update: { account: A, owner: authority('owner'), active: authority('active'), posting: authority('posting'), memo_key: key('memo'), json_metadata: '{}' },
  witness_update: { owner: A, url: 'https://x.y', block_signing_key: key('active'), props: { account_creation_fee: '3.000 PIXA', maximum_block_size: 131072, pxs_interest_rate: 123 }, fee: '0.000 PIXA' },
  account_witness_vote: { account: A, witness: B, approve: true },
  account_witness_proxy: { account: A, proxy: B },
  custom: { required_auths: [A], id: 5, data: 'abcd' },
  delete_comment: { author: A, permlink: 'p-1' },
  custom_json: { required_auths: [], required_posting_auths: [A], id: 'follow', json: '[]' },
  comment_options: { author: A, permlink: 'p-1', max_accepted_payout: '100.000 PXS', percent_pxs: 5000, allow_votes: true, allow_curation_rewards: false, extensions: [[0, { beneficiaries: [{ account: B, weight: 500 }] }]] },
  set_withdraw_vesting_route: { from_account: A, to_account: B, percent: 2500, auto_vest: true },
  limit_order_create2: { owner: A, orderid: 8, amount_to_sell: '1.000 PIXA', exchange_rate: { base: '1.000 PIXA', quote: '2.000 PXS' }, fill_or_kill: false, expiration: when },
  claim_account: { creator: A, fee: '0.000 PIXA', extensions: [] },
  create_claimed_account: { creator: A, new_account_name: 'newacct', owner: authority('owner'), active: authority('active'), posting: authority('posting'), memo_key: key('memo'), json_metadata: '{}', extensions: [] },
  change_recovery_account: { account_to_recover: A, new_recovery_account: B, extensions: [] },
  escrow_transfer: { from: A, to: B, agent: 'agentacct', escrow_id: 3, pxs_amount: '1.000 PXS', pixa_amount: '2.000 PIXA', fee: '0.100 PIXA', ratification_deadline: when, escrow_expiration: '2026-12-02T00:00:00', json_meta: '{}' },
  escrow_dispute: { from: A, to: B, agent: 'agentacct', who: A, escrow_id: 3 },
  escrow_release: { from: A, to: B, agent: 'agentacct', who: A, receiver: B, escrow_id: 3, pxs_amount: '1.000 PXS', pixa_amount: '2.000 PIXA' },
  escrow_approve: { from: A, to: B, agent: 'agentacct', who: A, escrow_id: 3, approve: true },
  transfer_to_savings: { from: A, to: B, amount: '1.000 PXS', memo: 'm' },
  transfer_from_savings: { from: A, request_id: 11, to: B, amount: '1.000 PXS', memo: 'm' },
  cancel_transfer_from_savings: { from: A, request_id: 11 },
  decline_voting_rights: { account: A, decline: true },
  claim_reward_balance: { account: A, reward_pixa: '1.000 PIXA', reward_pxs: '2.000 PXS', reward_vests: '3.000000 VESTS' },
  delegate_vesting_shares: { delegator: A, delegatee: B, vesting_shares: '5.000000 VESTS' },
  account_update2: { account: A, json_metadata: '{"a":1}', posting_json_metadata: '{"b":2}', extensions: [] },
  create_proposal: { creator: A, receiver: B, start_date: when, end_date: '2027-01-01T00:00:00', daily_pay: '10.000 PXS', subject: 'S', permlink: 'p-1', extensions: [] },
  update_proposal_votes: { voter: A, proposal_ids: [1, 2], approve: true, extensions: [] },
  remove_proposal: { proposal_owner: A, proposal_ids: [1], extensions: [] },
  update_proposal: { proposal_id: 1, creator: A, daily_pay: '9.000 PXS', subject: 'S', permlink: 'p-1', extensions: [] },
  collateralized_convert: { owner: A, requestid: 10, amount: '6.000 PIXA' },
  recurrent_transfer: { from: A, to: B, amount: '1.000 PXS', memo: 'm', recurrence: 24, executions: 2, extensions: [] },
  witness_set_properties: { owner: A, props: [['key', '02' + 'ab'.repeat(32)], ['maximum_block_size', '00000200']], extensions: [] },
  request_account_recovery: { recovery_account: A, account_to_recover: B, new_owner_authority: authority('owner'), extensions: [] },
  recover_account: { account_to_recover: A, new_owner_authority: authority('owner'), recent_owner_authority: authority('active'), extensions: [] },
  custom_binary: { required_owner_auths: [], required_active_auths: [A], required_posting_auths: [], required_auths: [], id: 'x', data: 'abcd' },
};

const transaction = (operation) => ({ ref_block_num: 1, ref_block_prefix: 2, expiration: '2026-12-01T00:00:00', operations: [operation], extensions: [] });

const ours = (operation) => {
  const buffer = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
  serializer.Transaction(buffer, transaction(operation));
  buffer.flip();
  // The node's hex is of a signed transaction, so it ends in an empty signature list.
  return Buffer.from(buffer.toBuffer()).toString('hex') + '00';
};

const theirs = async (operation) => {
  const response = await fetch(config.node, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'condenser_api.get_transaction_hex', params: [{ ...transaction(operation), signatures: [] }] }),
  });
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message);
  return payload.result;
};

(async () => {
  const fixture = {};
  let bad = 0;
  for (const [name, data] of Object.entries(samples)) {
    const operation = [name, data];
    let local;
    let remote;
    try { local = ours(operation); } catch (error) { local = `serializer threw: ${error.message}`; }
    try { remote = await theirs(operation); } catch (error) { remote = `node refused: ${error.message.slice(0, 80)}`; }
    if (local === remote) {
      fixture[name] = { operation, hex: remote };
      console.log(`ok    ${name}`);
    } else {
      bad++;
      console.log(`DIFF  ${name}\n  ours  ${local}\n  node  ${remote}`);
    }
  }
  console.log(`${Object.keys(fixture).length} match, ${bad} differ`);

  // A throwaway key has no authority anywhere, so the node refuses the transaction, and its refusal
  // names the keys it recovered from the signature. That shows the signature is over Pixagram's chain ID.
  const throwaway = PrivateKey.fromSeed(`throwaway-${Date.now()}`);
  const signed = new Transaction(transaction(['transfer', samples.transfer])).sign(throwaway);
  const refusal = await (await fetch(config.node, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'condenser_api.verify_authority', params: [signed] }),
  })).text();
  const recovered = refusal.includes(throwaway.createPublic().toString());
  console.log(recovered ? 'ok    the node recovers our key from our signature' : 'DIFF  the node recovered a different key');
  if (!recovered) bad++;
  if (process.argv.includes('--write')) {
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
    fs.writeFileSync(FIXTURE, JSON.stringify(fixture, null, 2) + '\n');
  }
  process.exit(bad ? 1 : 0);
})();
