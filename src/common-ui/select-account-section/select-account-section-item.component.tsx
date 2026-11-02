import { LocalAccountListItem } from '@interfaces/list-item.interface';
import React, { SyntheticEvent, useState } from 'react';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { UsernameAvatar } from 'src/common-ui/username-with-avatar/username-with-avatar';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';

interface AccountItemProps {
  isLast: boolean;
  item: LocalAccountListItem;
  selectedAccount: string;
  handleItemClicked: (value: LocalAccountListItem['value']) => void;
  closeDropdown: () => void;
  setInfoMessage?: (key: string, params?: string[]) => void;
  dragHandle: DraggableProvidedDragHandleProps | null | undefined;
  isOnMain: boolean;
}

export const SelectAccountSectionItemComponent = ({
  item,
  selectedAccount,
  isLast,
  handleItemClicked,
  closeDropdown,
  setInfoMessage,
  dragHandle,
  isOnMain,
}: AccountItemProps) => {
  const [hovered, setHovered] = useState<boolean>(false);

  const copyUsernameToClipboard = async (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    await navigator.clipboard.writeText(item.value);
    closeDropdown();
    if (setInfoMessage) {
      setInfoMessage('popup_html_text_copied', [item.value]);
    }
  };
  const renderCheckedAccount = () => {
    if (isOnMain)
      return (
        <div className="icons-wrapper">
          {selectedAccount === item.value && !hovered && (
            <SVGIcon
              icon={SVGIcons.SELECT_ACTIVE}
              className="active-icon"
              forceHover={hovered}
              hoverable
            />
          )}
          {hovered && (
            <div
              className={`hovered-icons ${
                process.env.IS_FIREFOX ? 'firefox' : ''
              }`}
            >
              <div onClick={(event) => copyUsernameToClipboard(event)}>
                <SVGIcon className="copy-icon" icon={SVGIcons.SELECT_COPY} />
              </div>
              {!process.env.IS_FIREFOX && (
                <span {...dragHandle}>
                  <SVGIcon icon={SVGIcons.SELECT_DRAG} className="drag-icon" />
                </span>
              )}
            </div>
          )}
        </div>
      );
    else if (selectedAccount === item.value)
      return (
        <SVGIcon
          icon={SVGIcons.SELECT_ACTIVE}
          className="active-icon"
          forceHover={hovered}
          hoverable
        />
      );
  };

  return (
    <div
      className="option"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        data-testid={`select-account-item-${item.value}`}
        className={`select-account-item ${
          selectedAccount === item.value ? 'selected' : ''
        }`}
        onClick={() => {
          handleItemClicked(item.value);
          closeDropdown();
        }}
      >
        <UsernameAvatar className="user-picture" username={item.value} />
        <div className="account-name">{item.label}</div>
        {renderCheckedAccount()}
      </div>
      {!isLast && <div className="separator"></div>}
    </div>
  );
};
