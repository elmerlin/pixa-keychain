import {
  RequestId,
  RequestRemoveAccountAuthority,
} from '@interfaces/keychain.interface';
import { Rpc } from '@interfaces/rpc.interface';
import React from 'react';
import { Separator } from 'src/common-ui/separator/separator.component';
import UsernameWithAvatar from 'src/common-ui/username-with-avatar/username-with-avatar';
import AuthorityChange, {
  useAuthorityChange,
} from 'src/dialog/components/authority-change/authority-change';
import Operation from 'src/dialog/components/operation/operation';
import RequestItem from 'src/dialog/components/request-item/request-item';

type Props = {
  data: RequestRemoveAccountAuthority & RequestId;
  domain: string;
  tab: number;
  rpc: Rpc;
};

const RemoveAccountAuthority = (props: Props) => {
  const { data } = props;
  const { operation, problem } = useAuthorityChange(data as never);
  return (
    <Operation
      title={chrome.i18n.getMessage('dialog_title_remove_auth')}
      {...props}
      data={{ ...data, reviewedOperation: operation } as never}
      canConfirm={!!operation}>
      <UsernameWithAvatar title="dialog_account" username={data.username} />
      <Separator type={'horizontal'} fullSize />
      <UsernameWithAvatar
        title="dialog_auth_account"
        username={data.authorizedUsername}
      />
      <Separator type={'horizontal'} fullSize />
      <RequestItem title="dialog_role" content={data.role} />
      <Separator type={'horizontal'} fullSize />
      <AuthorityChange
        operation={operation}
        problem={problem}
        username={data.username}
      />
    </Operation>
  );
};

export default RemoveAccountAuthority;
