import { forgetMk } from '@popup/multichain/actions/mk.actions';
import { resetNav } from '@popup/multichain/actions/navigation.actions';
import { RootState } from '@popup/multichain/store';
import { Theme, useThemeContext } from '@popup/theme.context';
import { Screen } from '@reference-data/screen.enum';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { MenuComponent } from 'src/common-ui/menu/menu.component';
import SettingsMenuItems from './settings-main-page-menu-items';

const SettingsMainPage = ({ forgetMk, resetNav }: PropsFromRedux) => {
  const { toggleTheme, theme } = useThemeContext();

  const logout = () => {
    resetNav();
    forgetMk();
  };
  const getIcon = () =>
    theme === Theme.DARK ? SVGIcons.MENU_THEME_LIGHT : SVGIcons.MENU_THEME_DARK;
  return (
    <div
      className="settings-main-page"
      data-testid={`${Screen.SETTINGS_MAIN_PAGE}-page`}>
      {/* <div className="love-text">
        {chrome.i18n.getMessage('html_popup_made_with_love_by_stoodkev')}
      </div> */}
      <MenuComponent
        title="popup_html_settings"
        isBackButtonEnable={true}
        rightAction={{
          icon: getIcon(),
          callback: toggleTheme,
          className: 'menu-toggle-theme',
        }}
        showDetachWindowOption
        isCloseButtonDisabled
        menuItems={SettingsMenuItems(logout)}></MenuComponent>
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {};
};

const connector = connect(mapStateToProps, {
  forgetMk,
  resetNav,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const SettingsMainPageComponent = connector(SettingsMainPage);
