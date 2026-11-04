# Add PIXA Keychain to your site

<!-- Written by scripts/build-api-docs.mjs from public/pixa_keychain.js. Change it there, then run npm run doc. -->

The extension adds `window.pixa_keychain` to every `https://` page, and to `localhost` and `127.0.0.1` for development. Your
site asks it to sign, the person reviews the request in the wallet's own window, and your callback gets the answer. You
never see a key.

## Detect it

The object arrives once the page has loaded, so wait for it for a moment before saying it isn't installed:

```js
async function findKeychain(ms = 2000) {
  const end = Date.now() + ms;
  while (!window.pixa_keychain && Date.now() < end) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return window.pixa_keychain ?? null;
}
```

`requestHandshake` also confirms it's there, and calls back without opening a window.

## Answers

Every callback gets one object:

| Field | What it is |
| --- | --- |
| `success` | `true` if it worked |
| `result` | What the request produced, such as a signature or the broadcast's result |
| `error` | Why it didn't work: `user_cancel` if the person said no, `incomplete` if the request wasn't valid, `ignored` or `busy` as below |
| `message` | A sentence you can show |
| `data` | The request as the wallet received it |
| `publicKey` | The public key that signed, when there is one |
| `request_id` | The number of this request |

Check `success` before you use `result`. If you're relying on a signature, check it yourself: the page can't tell the real
extension from a script pretending to be it.

## Good to know

- **One at a time.** A page has one request at a time. A new one replaces one still waiting for the person (it answers
  `ignored`), and is itself refused with `busy` if the last one is already being sent. Wait for each answer.
- **Amounts** are strings with three decimals (`"1.000"`), in `PIXA` and `PXS`. Delegations are in `PP` or `VESTS`. A request
  in `HIVE` or `HBD` is refused.
- **Don't ask unprompted.** A request opens a window, so make it the result of something the person did.
- **`rpc`** is still accepted, but ignored. A site doesn't get to choose the person's node.
- **`requestSignBuffer`** signs text, exactly as the person reads it. It won't decode bytes from JSON, and it refuses text
  that starts with Pixa's chain ID, because that could be signed into a transaction.
- **Reward settings** on `requestPost` must be about that post, and they're shown in the review every time.
- **Weights** in authority requests must be whole numbers from 1 to 65535.
- **Don't ask again** is the person's choice, and narrow: one kind of request with the posting key. Requests with any other
  key always open a window.

## Coming from Hive Keychain

The requests have the same shape, so most sites only need the global renamed and Pixa's tokens:

```js
const keychain = window.pixa_keychain;
```

Both extensions can run in one browser, because nothing here shares a name with Hive Keychain's.

## Try it

[`example/main.html`](../example/main.html) has a form for every request. Serve it from a local address and open it with the
extension installed:

```bash
cd example
python3 -m http.server 1337
```

Then go to http://localhost:1337/main.html. Requests from it are real, so use a test account.

## Requests

- [requestHandshake](#requesthandshake)
- [requestEncodeMessage](#requestencodemessage)
- [requestEncodeWithKeys](#requestencodewithkeys)
- [requestVerifyKey](#requestverifykey)
- [requestSignBuffer](#requestsignbuffer)
- [requestAddAccountAuthority](#requestaddaccountauthority)
- [requestRemoveAccountAuthority](#requestremoveaccountauthority)
- [requestAddKeyAuthority](#requestaddkeyauthority)
- [requestRemoveKeyAuthority](#requestremovekeyauthority)
- [requestBroadcast](#requestbroadcast)
- [requestSignTx](#requestsigntx)
- [requestSignedCall](#requestsignedcall)
- [requestPost](#requestpost)
- [requestVote](#requestvote)
- [requestCustomJson](#requestcustomjson)
- [requestTransfer](#requesttransfer)
- [requestSavingsOperation](#requestsavingsoperation)
- [requestDelegation](#requestdelegation)
- [requestWitnessVote](#requestwitnessvote)
- [requestProxy](#requestproxy)
- [requestPowerUp](#requestpowerup)
- [requestPowerDown](#requestpowerdown)
- [requestCreateClaimedAccount](#requestcreateclaimedaccount)
- [requestCreateProposal](#requestcreateproposal)
- [requestRemoveProposal](#requestremoveproposal)
- [requestUpdateProposalVote](#requestupdateproposalvote)
- [requestAddAccount](#requestaddaccount)
- [requestConversion](#requestconversion)
- [requestRecurrentTransfer](#requestrecurrenttransfer)

### requestHandshake

This function is called to verify Keychain installation on a user's device

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | function | Confirms Keychain installation (has no parameters) |

### requestEncodeMessage

This function is called to verify that the user has a certain authority over an account, by requesting to decode a message

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `receiver` | String | Account that will decode the string |
| `message` | String | Message to be encrypted. It has to start with # |
| `key` | String | Type of key. Can be 'Posting','Active' or 'Memo' |
| `callback` | function | Function that handles Keychain's response to the request |

```js
const keychain = window.pixa_keychain;
const message = '#' + username + Date.now();
keychain.requestEncodeMessage(username, myUsername, message, 'Memo', (response) => {
  if (response.success) {
    const encodedMessage = response.result;
    // Send message to a server where you can use your private key to decode it
  }
});
```

### requestEncodeWithKeys

This function is called to allow encoding a message with multiple receivers. Useful when a message has several receivers

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `publicKeys` | Array<String> | Key that can decode the string |
| `message` | String | Message to be encrypted. It has to start with # |
| `key` | String | Type of key. Can be 'Posting','Active' or 'Memo' |
| `callback` | function | Function that handles Keychain's response to the request |

```js
const keychain = window.pixa_keychain;
const message = '#' + username + Date.now();
keychain.requestEncodeWithKeys(username, [pubKey1, pubKey2], message, 'Memo', (response) => {
  if (response.success) {
    const encodedMessages = response.result;
    // Send message to a server where you can use your private key to decode it
  }
});
```

### requestVerifyKey

This function is called to verify that the user has a certain authority over an account, by requesting to decode a message

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `message` | String | Message to be decoded by the account |
| `key` | String | Type of key. Can be 'Posting','Active' or 'Memo' |
| `callback` | function | Function that handles Keychain's response to the request |

```js
const keychain = window.pixa_keychain;
keychain.requestVerifyKey('pixtopia', encodedMessage, 'Posting', (response) => {
  if (response.success === true) {
    const decodedMessage = response.result;
  }
});
```

### requestSignBuffer

Requests a message to be signed with proper authority

| Parameter | Type | Description |
| --- | --- | --- |
| `account` (optional) | String | Pixa account to perform the request. If null, user can choose the account from a dropdown |
| `message` | String | Message to be signed by the account |
| `key` | String | Type of key. Can be 'Posting','Active' or 'Memo' |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |
| `title` (optional) | String | Ignored. The wallet writes its own title |

### requestAddAccountAuthority

Requests to add account authority over another account.

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `authorizedUsername` | String | Authorized account |
| `role` | String | Type of authority. Can be 'Posting' or 'Active' |
| `weight` | number | Weight of the authority |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// Gives @pixtopia active authority with weight 2 to `account`
const keychain = window.pixa_keychain
keychain.requestAddAccountAuthority(account, 'pixtopia', 'Active', 2, (response) => {
  console.log(response);
});
```

### requestRemoveAccountAuthority

Requests to remove an account authority over another account.

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `authorizedUsername` | String | Account to lose authority |
| `role` | String | Type of authority. Can be 'Posting' or 'Active' |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// Removes @pixtopia's active authority from `account`
const keychain = window.pixa_keychain;
keychain.requestRemoveAccountAuthority(account, 'pixtopia', 'Active', (response) => {
  console.log(response);
});
```

### requestAddKeyAuthority

Requests to add a new key authority to an account.

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `authorizedKey` | String | New public key to be associated with the account |
| `role` | String | Type of authority. Can be 'Posting' or 'Active' |
| `weight` | number | Weight of the key authority |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
const keychain = window.pixa_keychain;
keychain.requestAddKeyAuthority(username, publicKey, 'Posting', 1, (response) => {
  console.log(response);
});
```

### requestRemoveKeyAuthority

Requests to remove a key to an account.

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `authorizedKey` | String | Key to be removed (public key). |
| `role` | String | Type of authority. Can be 'Posting' or 'Active' |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
const keychain = window.pixa_keychain;
keychain.requestRemoveKeyAuthority(username, publicKey, 'Posting', (response) => {
  console.log(response);
});
```

### requestBroadcast

Generic broadcast request

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `operations` | Array | Array of operations to be broadcasted |
| `key` | String | Type of key. Can be 'Posting' or 'Active' |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
const keychain = window.pixa_keychain;
keychain.requestBroadcast('pixa.team', [
  [
    'account_witness_vote',
    {
      account: 'pixa.team',
      witness: 'pixtopia',
      approve: true
    }
  ]
], 'Active', (response) => {
  console.log(response);
});
```

### requestSignTx

Requests to sign a transaction with a given authority

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `tx` | Object | Unsigned transaction |
| `key` | String | Type of key. Can be 'Posting' or 'Active' |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// This example would be done much easier with requestBroadcast
const node = 'https://api.pixagram.com';
const call = async (method, params) =>
  (await (await fetch(node, {
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })).json()).result;

const { head_block_number, head_block_id } = await call('condenser_api.get_dynamic_global_properties', []);
const prefix = head_block_id.slice(8, 16).match(/../g).reverse().join('');
const tx = {
  ref_block_num: head_block_number & 0xffff,
  ref_block_prefix: parseInt(prefix, 16),
  expiration: new Date(Date.now() + 600000).toISOString().slice(0, 19),
  operations: [...], // Add operations here
  extensions: [],
};
window.pixa_keychain.requestSignTx(username, tx, 'Posting', async (response) => {
  if (response.success) {
    await call('condenser_api.broadcast_transaction', [response.result]);
  }
});
```

### requestSignedCall

Disabled, as upstream left it. It does nothing and never calls back. Use requestBroadcast or requestSignTx.

### requestPost

Requests to broadcast a blog post/comment

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `title` | String | Title of the blog post |
| `body` | String | Content of the blog post |
| `parent_perm` | String | Permlink of the parent post. Main tag for a root post |
| `parent_account` | String | Author of the parent post. Pass '' for a root post |
| `json_metadata` | String | The post's metadata, as JSON |
| `permlink` | String | Permlink of the blog post |
| `comment_options` | String | Reward settings for this post, as JSON, or ''. They must name this author and permlink, and they're shown in the review |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
const keychain = window.pixa_keychain;
keychain.requestPost(
  'pixtopia',
  'Hello World!',
  'This is a blog post',
  'blog',
  '',
  JSON.stringify({ format: 'markdown', tags: ['blog'] }),
  'hello-world',
  JSON.stringify({
    author: 'pixtopia',
    permlink: 'hello-world',
    max_accepted_payout: '100000.000 PXS',
    percent_pxs: 10000,
    allow_votes: true,
    allow_curation_rewards: true,
    extensions: [[0, { beneficiaries: [{ account: 'pixa.team', weight: 1000 }] }]],
  }),
  (response) => {
    console.log(response);
  },
);
```

### requestVote

Requests a vote

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `permlink` | String | Permlink of the blog post |
| `author` | String | Author of the blog post |
| `weight` | Number | Weight of the vote, comprised between -10,000 (-100%) and 10,000 (100%) |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// Upvote with 50% weight
const keychain = window.pixa_keychain;
keychain.requestVote('pixa.team', 'hello-world', 'pixtopia', 5000, (response) => {
  console.log(response);
});
```

### requestCustomJson

Requests a custom JSON broadcast

| Parameter | Type | Description |
| --- | --- | --- |
| `account` (optional) | String | Pixa account to perform the request. If null, user can choose the account from a dropdown |
| `id` | String | Type of custom_json to be broadcasted |
| `key` | String | Type of key. Can be 'Posting' or 'Active' |
| `json` | String | Stringified custom json |
| `display_msg` | String | Message to display to explain to the user what this broadcast is about |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
const keychain = window.pixa_keychain;
keychain.requestCustomJson(null, 'my-app', 'Posting', JSON.stringify({ action: 'hello' }), 'Say hello in My App', (response) => {
  console.log(response);
});
```

### requestTransfer

Requests a transfer

| Parameter | Type | Description |
| --- | --- | --- |
| `account` | String | Pixa account to perform the request |
| `to` | String | Pixa account to receive the transfer |
| `amount` | String | Amount to be transfered. Requires 3 decimals. |
| `memo` | String | The memo will be automatically encrypted if starting by '#' and the memo key is available on Keychain. It will also overrule the account to be enforced, regardless of the 'enforce' parameter |
| `currency` | String | 'PIXA' or 'PXS' |
| `callback` | function | Function that handles Keychain's response to the request |
| `enforce` (optional) | boolean | If set to true, user cannot chose to make the transfer from another account |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
const keychain = window.pixa_keychain;
keychain.requestTransfer(username, toUsername, '1.000', '', 'PIXA', (response) => {
  console.log(response)
}, true);
```

### requestSavingsOperation

Requests a savings operation (deposit or withdraw)

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `to` | String | Account to receive the savings transfer |
| `amount` | String | Amount to be transferred. Requires 3 decimals. |
| `currency` | String | 'PIXA' or 'PXS' |
| `operation` | String | 'deposit' or 'withdraw' |
| `memo` (optional) | String | Memo attached to the savings operation |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
const keychain = window.pixa_keychain;
keychain.requestSavingsOperation(username, toUsername, '1.000', 'PXS', 'deposit', 'test memo', (response) => {
  console.log(response);
});
```

### requestDelegation

Requests a delegation broadcast

| Parameter | Type | Description |
| --- | --- | --- |
| `username` (optional) | String | Pixa account to perform the request. If null, user can choose the account from a dropdown |
| `delegatee` | String | Account to receive the delegation |
| `amount` | String | Amount to be transfered. Requires 3 decimals for PP, 6 for VESTS. |
| `unit` | String | PP or VESTS |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestDelegation(null, 'pixtopia', '1.000', 'PP', (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestWitnessVote

Requests a witness vote broadcast

| Parameter | Type | Description |
| --- | --- | --- |
| `username` (optional) | String | Pixa account to perform the request. If null, user can choose the account from a dropdown |
| `witness` | String | Account to receive the witness vote |
| `vote` | boolean | Set to true to vote for the witness, false to unvote |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// Unvote our witness vote for @pixtopia
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestWitnessVote(null, 'pixtopia', false, (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestProxy

Select an account as proxy

| Parameter | Type | Description |
| --- | --- | --- |
| `username` (optional) | String | Pixa account to perform the request. If null, user can choose the account from a dropdown |
| `proxy` | String | Account to become the proxy. Empty string ('') to remove a proxy |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// Let @pixtopia use our voting power in governance votes
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestProxy(null, 'pixtopia', (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
// Remove voting proxy
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestProxy(null, '', (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestPowerUp

Request a power up

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `recipient` | String | Account to receive the power up |
| `hive` | String | Amount of PIXA to be powered up |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// Power up 5 PP
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestPowerUp(username, username, '5.000', (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestPowerDown

Request a power down

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `hive_power` | String | Amount of PIXA to be powered down |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// Power down 5 PP
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestPowerDown(username, '5.000', (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestCreateClaimedAccount

Request the creation of an account using claimed tokens

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `new_account` | String | New account to be created |
| `owner` | String | Owner authority, as JSON |
| `active` | String | Active authority, as JSON |
| `posting` | String | Posting authority, as JSON |
| `memo` | String | public memo key |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

### requestCreateProposal

Request the creation of a proposal

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `receiver` | String | Account receiving the funding if the proposal is voted |
| `subject` | String | Title of the proposal |
| `permlink` | String | Permlink to the proposal description |
| `daily_pay` | String | Daily amount to be received by `receiver`, such as '10.000 PXS' |
| `start` | String | Starting date, such as '2027-01-01T00:00:00' |
| `end` | String | Ending date, in the same form |
| `extensions` | String | Stringified Array of extensions |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestCreateProposal('pixtopia', 'pixtopia', 'PIXA Keychain development', 'pixa-keychain-proposal', '10.000 PXS', '2027-01-01T00:00:00', '2027-12-31T00:00:00', JSON.stringify([]), (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestRemoveProposal

Request the removal of a DHF proposal

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `proposal_ids` | String | Stringified Array of ids of the proposals to be removed |
| `extensions` | String | Stringified Array of extensions |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestRemoveProposal(username, JSON.stringify([216]), JSON.stringify([]), (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestUpdateProposalVote

Vote for a proposal, or take a vote back

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `proposal_ids` | String | Stringified Array of Ids of the proposals to be voted |
| `approve` | boolean | Set to true to support the proposal, false to remove a vote |
| `extensions` | String | Stringified Array of extensions |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// Approve a proposal
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestUpdateProposalVote(username, JSON.stringify([216]), true, JSON.stringify([]), (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
// Unapprove a proposal
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestUpdateProposalVote(username, JSON.stringify([216]), false, JSON.stringify([]), (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestAddAccount

Add a new account to Keychain

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | username of the account to be added |
| `keys` | Object | private keys of the account : {active:'...',posting:'...',memo:'...'}. At least one must be specified. Alternatively, authorized accounts can be specified with @${username}. |
| `callback` | function | Function that handles Keychain's response to the request |

```js
if (window.pixa_keychain) {
  const postingKey = '...';
  const keychain = window.pixa_keychain;
  keychain.requestAddAccount(username, {
    posting: postingKey
  }, (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestConversion

Request currency conversion

| Parameter | Type | Description |
| --- | --- | --- |
| `username` | String | Pixa account to perform the request |
| `amount` | String | amount to be converted. |
| `collaterized` | Boolean | true to convert PIXA to PXS. false to convert PXS to PIXA. |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |

```js
// Convert 5 PIXA to PXS
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestConversion(username, '5.000', true, (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```

### requestRecurrentTransfer

Request recurrent transfer

| Parameter | Type | Description |
| --- | --- | --- |
| `username` (optional) | String | Pixa account to perform the request |
| `to` | String | Pixa account receiving the transfers. |
| `amount` | String | amount to be sent on each execution. |
| `currency` | String | PIXA or PXS on mainnet. |
| `memo` | String | transfer memo |
| `recurrence` | Number | How often will the payment be triggered (in hours) - minimum 24. |
| `executions` | Number | The times the recurrent payment will be executed - minimum 2. |
| `callback` | function | Function that handles Keychain's response to the request |
| `rpc` (optional) | String | Ignored. The wallet always uses the person's own node |
| `pair_id` (optional) | Number | Pair id of the recurrent transfer |

```js
// Let's send @pixtopia 5 PIXA a day
if (window.pixa_keychain) {
  const keychain = window.pixa_keychain;
  keychain.requestRecurrentTransfer(null, 'pixtopia', '5.000', 'PIXA', '', 24, 7, (response) => {
    console.log(response);
  });
} else {
  alert('PIXA Keychain is not installed');
}
```
