import { useFiat } from '@popup/hive/hooks/use-fiat';
import { FiatUtils } from '@popup/hive/utils/fiat.utils';
import { RootState } from '@popup/multichain/store';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { CustomTooltip } from 'src/common-ui/custom-tooltip/custom-tooltip.component';

// What Pixa's witnesses say PIXA is worth, in whatever currency someone's looking at things in.
const PixaFeedPrice = ({ pricePerPixa }: PropsFromRedux) => {
  const fiat = useFiat();
  if (!pricePerPixa) return null;
  return (
    <CustomTooltip
      dataTestId="custom-tool-tip-feed-price"
      message={chrome.i18n.getMessage('popup_html_price_feed_info', [
        (1 / pricePerPixa).toFixed(3),
      ])}
      position="top"
      skipTranslation>
      <div className="pixa-feed-price" data-testid="pixa-feed-price">
        <span className="label">
          {chrome.i18n.getMessage('popup_html_price_feed')}
        </span>
        <span className="price">
          1 PIXA ≈ {FiatUtils.formatPrice(pricePerPixa, fiat)}
        </span>
      </div>
    </CustomTooltip>
  );
};

const mapStateToProps = (state: RootState) => {
  return { pricePerPixa: state.hive.currencyPrices?.hive?.usd };
};

const connector = connect(mapStateToProps, {});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const PixaFeedPriceComponent = connector(PixaFeedPrice);
