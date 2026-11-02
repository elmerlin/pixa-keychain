import React from 'react';
import ButtonComponent from 'src/common-ui/button/button.component';
import { SVGIcons } from 'src/common-ui/icons.enum';
import { SVGIcon } from 'src/common-ui/svg-icon/svg-icon.component';

export const ErrorFallback = ({ error, theme, chain }: any) => {
  const formattedErrorMessage = `
    \`\`\` 
    ${error.message} \n\r
    ${error.stack} \n\r
    \`\`\`
    `;

  const handleClickOnCopy = async () => {
    await navigator.clipboard.writeText(formattedErrorMessage);
  };

  return (
    <div className="error-page">
      <SVGIcon icon={SVGIcons.MESSAGE_ERROR} />
      <div className="title">
        {chrome.i18n.getMessage('error_message_title')}
      </div>

      <p className="recovery">
        {chrome.i18n.getMessage('error_message_recovery')}
      </p>
      <details className="detail">
        <summary>{chrome.i18n.getMessage('error_message_details')}</summary>
        <div className="diagnostics">
          <div className="message">{error.message.toString()}</div>
          <div className="stack">{error.stack.toString()}</div>
        </div>
      </details>
      <ButtonComponent
        onClick={() => handleClickOnCopy()}
        label="html_popup_copy_error"
      />
    </div>
  );
};
