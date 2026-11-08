import { KeychainRequest } from '@interfaces/keychain.interface';
import { BackgroundCommand } from '@reference-data/background-message-key.enum';
import React, { useState } from 'react';
import ButtonComponent, {
  ButtonType,
} from 'src/common-ui/button/button.component';
import { CheckboxPanelComponent } from 'src/common-ui/checkbox/checkbox-panel/checkbox-panel.component';
import { LoadingComponent } from 'src/common-ui/loading/loading.component';
import DialogHeader from 'src/dialog/components/dialog-header/dialog-header.component';
import RequestUsername from 'src/dialog/components/request-username/request-username';
import { useDomainCheck } from 'src/dialog/hooks/domain-check';
import { approvalFor, approvalWords } from 'src/utils/preferences.utils';

type Props = {
  title: string;
  children: JSX.Element[];
  onConfirm?: () => void;
  data: KeychainRequest;
  domain: string;
  tab: number;
  canWhitelist?: boolean;
  header?: string;
  checkboxLabelOverride?: string;
  accounts?: string[];
  username?: string;
  setUsername?: (username: string) => void;
  redHeader?: boolean;
  canConfirm?: boolean;
};

const Operation = ({
  title,
  children,
  onConfirm,
  domain,
  tab,
  data,
  header,
  checkboxLabelOverride,
  canWhitelist = false,
  accounts,
  username,
  redHeader,
  setUsername,
  canConfirm = true,
}: Props) => {
  const [keep, setKeep] = useState(false);
  const [loading, setLoading] = useState(false);

  const domainHeader = useDomainCheck({ ...data, domain });
  const approval = canWhitelist ? approvalFor(data) : null;
  // Says exactly what it will stop asking about, since that's all a saved approval covers.
  const words = approval ? approvalWords(approval) : null;

  const genericOnConfirm = () => {
    setLoading(true);

    chrome.runtime.sendMessage({
      command: BackgroundCommand.ACCEPT_TRANSACTION,
      value: {
        data: data,
        tab: tab,
        domain: domain,
        keep,
      },
    });
  };

  return (
    <div className="operation">
      <div className="operation-intro">
        <div className="request-site">
          <span className="label">
            {chrome.i18n.getMessage('popup_website')}
          </span>
          <span className="domain">{domain}</span>
        </div>
        <DialogHeader title={title} />
        {domainHeader && (
          <div className={`operation-header operation-red`}>{domainHeader}</div>
        )}
        {header && (
          <div
            className={`operation-header ${redHeader ? 'operation-red' : ''}`}
          >
            {header}
          </div>
        )}

        {accounts && (
          <RequestUsername
            accounts={accounts}
            username={username!}
            setUsername={setUsername!}
          />
        )}
      </div>
      <div className="scrollable">
        <div className="operation-details">
          <div className="operation-body">
            <div className="fields">{...children}</div>
          </div>
        </div>
      </div>

      {approval !== null && (
        <CheckboxPanelComponent
          onChange={setKeep}
          checked={keep}
          skipTranslation
          title={
            checkboxLabelOverride ||
            (words
              ? chrome.i18n.getMessage('dialog_no_prompt_for', [
                  words,
                  data.username!,
                  domain,
                ])
              : chrome.i18n.getMessage('dialog_no_prompt', [
                  title.toLowerCase(),
                  data.username!,
                  domain,
                ]))
          }
        />
      )}

      {!loading && (
        <div className={`operation-buttons `}>
          <ButtonComponent
            label="dialog_cancel"
            type={ButtonType.ALTERNATIVE}
            onClick={() => {
              window.close();
            }}
            height="small"
          />
          {canConfirm && (
            <ButtonComponent
              type={ButtonType.IMPORTANT}
              label="dialog_confirm"
              onClick={onConfirm || genericOnConfirm}
              height="small"
            />
          )}
        </div>
      )}

      <LoadingComponent hide={!loading} />
    </div>
  );
};

export default Operation;
