// Send Handshake event
$('#sw-handshake').click(function () {
  pixa_keychain.requestHandshake(function () {
    console.log('Handshake received!');
  });
});

// All transactions are sent via a swRequest event.

// Send decryption request
$('#send_decode').click(function () {
  pixa_keychain.requestVerifyKey(
    $('#decode_user').val(),
    $('#decode_message').val(),
    $('#decode_method option:selected').text(),
    function (response) {
      console.log('main js response - verify key');
      console.log(response);
    },
  );
});

$('#send_encode').click(() => {
  pixa_keychain.requestEncodeMessage(
    $('#encode_user').val(),
    $('#encode_receiver').val(),
    $('#encode_message').val(),
    $('#encode_method option:selected').text(),
    function (response) {
      console.log('main js response - verify key');
      console.log(response);
    },
  );
});
$('#send_encode_multisig').click(() => {
  pixa_keychain.requestEncodeWithKeys(
    $('#encode_user_multisig').val(),
    $('#encode_public_keys_multisig').val().split(','),
    $('#encode_message_multisig').val(),
    $('#encode_method_multisig option:selected').text(),
    function (response) {
      console.log('main js response - verify key');
      console.log(response);
    },
  );
});

// Send post request
$('#send_post').click(function () {
  pixa_keychain.requestPost(
    $('#post_username').val(),
    $('#post_title').val(),
    $('#post_body').val(),
    $('#post_pp').val(),
    $('#post_pu').val(),
    $('#post_json').val(),
    $('#post_perm').val(),
    $('#comment_options').val().length
      ? $('#comment_options').val()
      : undefined,
    function (response) {
      console.log('main js response - post');
      console.log(response);
    },
  );
});

// Send vote request
$('#send_vote').click(function () {
  pixa_keychain.requestVote(
    $('#vote_username').val(),
    $('#vote_perm').val(),
    $('#vote_author').val(),
    $('#vote_weight').val(),
    function (response) {
      console.log('main js response - vote');
      console.log(response);
    },
    $('#vote_rpc').val().length ? $('#vote_rpc').val() : undefined,
  );
});

// Send Custom JSON request
$('#send_custom').click(function () {
  console.log('click');
  pixa_keychain.requestCustomJson(
    $('#custom_username').val(),
    $('#custom_id').val(),
    $('#custom_method option:selected').text(),
    $('#custom_json').val(),
    $('#custom_message').val(),
    function (response) {
      console.log('main js response - custom JSON');
      console.log(response);
    },
    $('#custom_rpc').val().length ? $('#custom_rpc').val() : undefined,
  );
});

// Send transfer request
$('#send_tra').click(function () {
  console.log('transfer');
  pixa_keychain.requestTransfer(
    $('#transfer_username').val().length ? $('#transfer_username').val() : null,
    $('#transfer_to').val(),
    $('#transfer_val').val(),
    $('#transfer_memo').val(),
    $('#transfer_currency option:selected').text(),
    function (response) {
      console.log('main js response - transfer');
      console.log(response);
    },
    $('#transfer_enforce').is(':checked'),
  );
});

// Send delegation
$('#send_delegation').click(function () {
  pixa_keychain.requestDelegation(
    $('#delegation_username').val().length
      ? $('#delegation_username').val()
      : undefined,
    $('#delegation_delegatee').val(),
    $('#delegation_sp').val(),
    $('#delegation_unit option:selected').text(),
    function (response) {
      console.log('main js response - delegation');
      console.log(response);
    },
  );
});

$('#send_signature').click(function () {
  pixa_keychain.requestSignBuffer(
    $('#sign_username').val().length ? $('#sign_username').val() : null,
    $('#sign_message').val(),
    $('#sign_method option:selected').text(),
    function (response) {
      console.log('main js response - sign');
      console.log(response);
    },
    null,
    $('#sign_message_title').val().length
      ? $('#sign_message_title').val()
      : null,
  );
});

$('#send_sign_tx').click(function () {
  pixa_keychain.requestSignTx(
    $('#tx_username').val(),
    JSON.parse($('#tx').val()),
    $('#tx_type option:selected').text(),
    function (response) {
      console.log('main js response - tx');
      console.log(response);
    },
  );
});

$('#send_addauth').click(function () {
  pixa_keychain.requestAddAccountAuthority(
    $('#addauth_username').val(),
    $('#addauth_authorized_username').val(),
    $('#addauth_role option:selected').text(),
    $('#addauth_weight').val(),
    function (response) {
      console.log('main js response - add auth');
      console.log(response);
    },
  );
});

$('#send_removeauth').click(function () {
  pixa_keychain.requestRemoveAccountAuthority(
    $('#removeauth_username').val(),
    $('#removeauth_authorized_username').val(),
    $('#removeauth_role option:selected').text(),
    function (response) {
      console.log('main js response - remove auth');
      console.log(response);
    },
  );
});

$('#send_addkey').click(function () {
  console.log('add key');
  pixa_keychain.requestAddKeyAuthority(
    $('#addkey_username').val(),
    $('#addkey_authorized_key').val(),
    $('#addkey_role option:selected').text(),
    $('#addkey_weight').val(),
    function (response) {
      console.log('main js response - add auth key');
      console.log(response);
    },
  );
});

$('#send_removekey').click(function () {
  pixa_keychain.requestRemoveKeyAuthority(
    $('#removekey_username').val(),
    $('#removekey_authorized_key').val(),
    $('#removekey_role option:selected').text(),
    function (response) {
      console.log('main js response - remove auth key');
      console.log(response);
    },
  );
});

$('#send_broadcast').click(function () {
  pixa_keychain.requestBroadcast(
    $('#broadcast_username').val(),
    JSON.parse($('#broadcast_operations').val()),
    $('#broadcast_method option:selected').text(),
    function (response) {
      console.log('main js response - broadcast');
      console.log(response);
    },
  );
});

$('#send_witness_vote').click(function () {
  pixa_keychain.requestWitnessVote(
    $('#witness_username').val().length
      ? $('#witness_username').val()
      : undefined,
    $('#witness').val(),
    $('#vote_wit').is(':checked'),
    function (response) {
      console.log('main js response - witness vote');
      console.log(response);
    },
  );
});

$('#send_proxy').click(function () {
  pixa_keychain.requestProxy(
    $('#proxy_username').val().length ? $('#proxy_username').val() : undefined,
    $('#proxy').val() ? $('#proxy').val() : '',
    function (response) {
      console.log('main js response - proxy');
      console.log(response);
    },
  );
});

$('#send_pu').click(function () {
  pixa_keychain.requestPowerUp(
    $('#pu_username').val(),
    $('#pu_recipient').val(),
    $('#pu_steem').val(),
    function (response) {
      console.log('main js response - power up');
      console.log(response);
    },
  );
});

$('#send_pd').click(function () {
  pixa_keychain.requestPowerDown(
    $('#pd_username').val(),
    $('#pd_sp').val(),
    function (response) {
      console.log('main js response - power down');
      console.log(response);
    },
  );
});

$('#send_create_claimed').click(function () {
  pixa_keychain.requestCreateClaimedAccount(
    $('#create_claimed_username').val(),
    $('#create_claimed_new_username').val(),
    $('#create_claimed_owner').val(),
    $('#create_claimed_active').val(),
    $('#create_claimed_posting').val(),
    $('#create_claimed_memo').val(),
    function (response) {
      console.log('main js response - create claimed account');
      console.log(response);
    },
  );
});

$('#send_cp').click(function () {
  pixa_keychain.requestCreateProposal(
    $('#cp_username').val(),
    $('#cp_receiver').val(),
    $('#cp_subject').val(),
    $('#cp_permlink').val(),
    $('#cp_daily_pay').val(),
    $('#cp_start').val(),
    $('#cp_end').val(),
    $('#cp_extensions').val(),
    function (response) {
      console.log('main js response - create proposal');
      console.log(response);
    },
  );
});

$('#send_rp').click(function () {
  pixa_keychain.requestRemoveProposal(
    $('#rp_username').val(),
    $('#rp_proposal_ids').val(),
    $('#cp_extensions').val(),
    function (response) {
      console.log('main js response - remove proposal');
      console.log(response);
    },
  );
});

$('#send_vp').click(function () {
  pixa_keychain.requestUpdateProposalVote(
    $('#vp_username').val(),
    JSON.parse($('#vp_proposal_ids').val()),
    $('#vp_approve').is(':checked'),
    $('#vp_extensions').val(),
    function (response) {
      console.log('main js response - update proposal votes');
      console.log(response);
    },
  );
});

$('#send_save').click(function () {
  pixa_keychain.requestAddAccount(
    $('#save_username').val(),
    JSON.parse($('#save_keys').val()),
    function (response) {
      console.log('main js response - account saved');
      console.log(response);
    },
  );
});

$('#send_con').click(function () {
  pixa_keychain.requestConversion(
    $('#con_username').val(),
    $('#con_amount').val(),
    $('#con_collaterized').is(':checked'),
    function (response) {
      console.log('main js response - conversion');
      console.log(response);
    },
  );
});

$('#send_rec').click(function () {
  pixa_keychain.requestRecurrentTransfer(
    $('#rec_username').val().length ? $('#rec_username').val() : null,
    $('#rec_to').val(),
    $('#rec_amount').val(),
    $('#rec_currency option:selected').text(),
    $('#rec_memo').val(),
    parseInt($('#rec_recurrence').val()),
    parseInt($('#rec_ex').val()),
    function (response) {
      console.log('main js response - recurrent transfer');
      console.log(response);
    },
  );
});
