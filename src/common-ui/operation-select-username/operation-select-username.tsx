import React, { useState } from 'react';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { UsernameAvatar } from 'src/common-ui/username-with-avatar/username-with-avatar';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';

type Props = {
  accounts: string[];
  username: string;
  setUsername: (username: string) => void;
  label?: string;
};

const OperationSelectUsername = ({
  accounts,
  username,
  setUsername,
  label,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (selectedUsername: string) => {
    setUsername(selectedUsername);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="operation-select-username">
      {label && <div className="label">{chrome.i18n.getMessage(label)}</div>}

      <div className="select-container">
        <div className="selected-item" onClick={toggleDropdown}>
          <UsernameAvatar className="user-avatar" username={username} />
          <span className="username">{username}</span>
          <SVGIcon
            className="dropdown-arrow"
            icon={
              isOpen ? SVGIcons.SELECT_ARROW_UP : SVGIcons.SELECT_ARROW_DOWN
            }
          />
        </div>

        {isOpen && (
          <div className="dropdown-options">
            {accounts.map((account) => (
              <div
                key={account}
                className={`option-item ${
                  account === username ? 'selected' : ''
                }`}
                onClick={() => handleItemClick(account)}
              >
                <UsernameAvatar className="user-avatar" username={account} />
                <span className="username">{account}</span>
                {account === username && (
                  <SVGIcon
                    icon={SVGIcons.SELECT_ACTIVE}
                    className="active-icon"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationSelectUsername;
