import { RequestTransfer } from '@interfaces/keychain.interface';
import { Rpc } from '@interfaces/rpc.interface';
import { useEffect, useState } from 'react';
import CurrencyUtils from 'src/popup/hive/utils/currency.utils';
import TransferUtils from 'src/popup/hive/utils/transfer.utils';
import PhishingUtils from 'src/utils/phishing.utils';

export const useTransferCheck = (data: RequestTransfer, rpc: Rpc) => {
  const [header, setHeader] = useState<string | undefined>(undefined);
  useEffect(() => {
    PhishingUtils.getPhishingAccounts().then((accs: string[]) => {
      let warning;
      if (accs.includes(data.to)) {
        warning = chrome.i18n.getMessage('popup_warning_phishing', [data.to]);
      } else {
        warning = TransferUtils.getTransferWarningLabel(
          data.to,
          data.type === 'transfer'
            ? CurrencyUtils.getCurrencyLabel(data.currency, rpc.testnet)
            : data.currency,
          data.memo,
          accs,
        );
      }
      setHeader(warning ? warning : undefined);
    });
  }, []);
  return header;
};
