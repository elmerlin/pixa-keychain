import React, { useEffect, useState } from 'react';
import OperationSummaries from 'src/dialog/components/operation-summary/operation-summary';
import RequestItem from 'src/dialog/components/request-item/request-item';
import AccountUtils from 'src/popup/hive/utils/account.utils';

/** Builds the update an authority request comes to. Nothing can be confirmed until it's on show. */
export const useAuthorityChange = (
  request: Parameters<typeof AccountUtils.getAuthorityChangeOperation>[0],
) => {
  const [operation, setOperation] = useState<unknown>();
  const [problem, setProblem] = useState<string>();
  useEffect(() => {
    AccountUtils.getAuthorityChangeOperation(request)
      .then(setOperation)
      .catch((error) =>
        setProblem(
          chrome.i18n.getMessage(error.message, error.messageParams) ||
            chrome.i18n.getMessage('bgd_ops_authority_not_reviewed'),
        ),
      );
  }, []);
  return { operation, problem };
};

type Props = {
  operation?: unknown;
  problem?: string;
  username: string;
};

const AuthorityChange = ({ operation, problem, username }: Props) => {
  if (problem) {
    return <RequestItem title="dialog_after_change" content={problem} red />;
  }
  return operation ? (
    <OperationSummaries operations={[operation]} username={username} />
  ) : (
    <></>
  );
};

export default AuthorityChange;
