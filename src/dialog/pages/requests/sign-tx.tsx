import {
  KeychainKeyTypesLC,
  RequestId,
  RequestSignTx,
} from '@interfaces/keychain.interface';
import { Rpc } from '@interfaces/rpc.interface';
import React from 'react';
import { Separator } from 'src/common-ui/separator/separator.component';
import UsernameWithAvatar from 'src/common-ui/username-with-avatar/username-with-avatar';
import CollaspsibleItem from 'src/dialog/components/collapsible-item/collapsible-item';
import OperationSummaries from 'src/dialog/components/operation-summary/operation-summary';
import Operation from 'src/dialog/components/operation/operation';
import RequestItem from 'src/dialog/components/request-item/request-item';
import { understandsAll } from 'src/dialog/utils/operation-summary.utils';

type Props = {
  data: RequestSignTx & RequestId;
  domain: string;
  tab: number;
  rpc: Rpc;
};

const SignTx = (props: Props) => {
  const { data } = props;
  const understood = understandsAll(data.tx?.operations, data.username);

  return (
    <Operation
      title={chrome.i18n.getMessage('dialog_title_sign_tx')}
      {...props}
      canWhitelist={
        understood && data.method.toLowerCase() !== KeychainKeyTypesLC.active
      }>
      <UsernameWithAvatar title="dialog_account" username={data.username} />
      <Separator type={'horizontal'} fullSize />
      <RequestItem title="dialog_key" content={data.method} />
      <Separator type={'horizontal'} fullSize />
      <OperationSummaries
        operations={data.tx?.operations}
        username={data.username}
      />
      <Separator type={'horizontal'} fullSize />
      <CollaspsibleItem
        title="dialog_tx"
        content={JSON.stringify(data.tx, undefined, 2)}
        pre
        startOpen={!understood}
      />
    </Operation>
  );
};

export default SignTx;
