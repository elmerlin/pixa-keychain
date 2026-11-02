import React, { useEffect, useState } from 'react';
import { identicon, loadAvatar } from 'src/utils/avatar.utils';

type Props = {
  username: string;
  title?: string;
  className?: string;
};

const UsernameWithAvatar = ({ username, title, className = '' }: Props) => {
  const formattedUsername = username.startsWith('@')
    ? username.trim()
    : `@${username.trim()}`;

  const usernameElement = <span className="username">{formattedUsername}</span>;

  return (
    <div className={`username-with-avatar ${className}`}>
      {title && <span className="title">{chrome.i18n.getMessage(title)}</span>}
      <div className="avatar-username-container">
        <>
          {usernameElement}
          <UsernameAvatar username={formattedUsername.slice(1)} />
        </>
      </div>
    </div>
  );
};

export const UsernameAvatar = ({
  username,
  className = 'user-avatar',
}: {
  username: string;
  className?: string;
}) => {
  const name = username.trim().replace(/^@/, '');
  const [image, setImage] = useState<{ name: string; uri: string | null }>();
  useEffect(() => {
    let mounted = true;
    loadAvatar(name).then((uri) => {
      if (mounted) setImage({ name, uri });
    });
    return () => {
      mounted = false;
    };
  }, [name]);
  const sprite = identicon(name);
  if (image?.name === name && image.uri) {
    return (
      <img
        className={`account-avatar ${className}`}
        src={image.uri}
        alt={name}
        onError={() => setImage({ name, uri: null })}
      />
    );
  }
  return (
    <svg
      className={`account-avatar ${className}`}
      viewBox="0 0 7 7"
      role="img"
      aria-label={name}
    >
      <rect width="7" height="7" rx="1" fill="var(--raised)" />
      {sprite.cells.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x + 1}
          y={y + 1}
          width="1"
          height="1"
          fill={`var(--prism-${sprite.color})`}
        />
      ))}
    </svg>
  );
};

export default UsernameWithAvatar;
