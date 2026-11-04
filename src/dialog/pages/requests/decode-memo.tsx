import { decode } from '@hiveio/hive-js/lib/auth/memo';
import {
  KeychainKeyTypesLC,
  RequestDecode,
  RequestId,
} from '@interfaces/keychain.interface';
import { Rpc } from '@interfaces/rpc.interface';
import { VaultKey } from '@reference-data/vault-message-key.enum';
import React, { useEffect, useState } from 'react';
import { Separator } from 'src/common-ui/separator/separator.component';
import UsernameWithAvatar from 'src/common-ui/username-with-avatar/username-with-avatar';
import Operation from 'src/dialog/components/operation/operation';
import RequestItem from 'src/dialog/components/request-item/request-item';
import AccountUtils from 'src/popup/hive/utils/account.utils';
import { getRequiredWifType } from 'src/utils/requests.utils';
import VaultUtils from 'src/utils/vault.utils';

type Props = {
  data: RequestDecode & RequestId;
  domain: string;
  tab: number;
  rpc: Rpc;
};

// What a site gets is the decrypted text, and it could be someone's private memo copied from the
// chain rather than a login challenge. So it's read here, and shown before anyone agrees to share it.
const readMessage = async (data: RequestDecode & RequestId) => {
  const mk = await VaultUtils.getValueFromVault(VaultKey.__MK);
  const accounts = await AccountUtils.getAccountsFromLocalStorage(mk);
  const account = accounts.find(({ name }) => name === data.username);
  return decode(account?.keys[getRequiredWifType(data)], data.message) as string;
};

const DecodeMemo = (props: Props) => {
  const { data, domain } = props;
  const [decoded, setDecoded] = useState<string>();
  const [unreadable, setUnreadable] = useState(false);
  useEffect(() => {
    readMessage(data)
      .then(setDecoded)
      .catch(() => setUnreadable(true));
  }, []);
  return (
    <Operation
      title={chrome.i18n.getMessage('dialog_title_decode')}
      header={chrome.i18n.getMessage('dialog_desc_decode', [
        domain,
        data.method,
        data.username,
      ])}
      {...props}
      canConfirm={decoded !== undefined}
      canWhitelist={data.method.toLowerCase() !== KeychainKeyTypesLC.active}>
      <UsernameWithAvatar title="dialog_account" username={data.username} />
      <Separator type={'horizontal'} fullSize />
      <RequestItem title="dialog_key" content={data.method} />
      <Separator type={'horizontal'} fullSize />
      <RequestItem
        title="dialog_decoded_message"
        content={
          unreadable ? chrome.i18n.getMessage('dialog_decode_failed') : decoded ?? ''
        }
      />
    </Operation>
  );
};

export default DecodeMemo;
