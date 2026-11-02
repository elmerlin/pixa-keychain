import React from 'react';
import { SVGIcons } from 'src/common-ui/icons.enum';

interface SwitchProps {
  onChange: (value: any) => void;
  selectedValue: any;
  leftValue: any;
  rightValue: any;
  leftValueIcon?: SVGIcons;
  rightValueIcon?: SVGIcons;
  leftValueLabel?: string;
  rightValueLabel?: string;
  skipLeftTranslation?: boolean;
  skipRightTranslation?: boolean;
  hint?: string;
  skipHintTranslation?: boolean;
  dataTestId?: string;
}

const SwitchComponent = (props: SwitchProps) => {
  return (
    <div className="switch-container">
      <div className="switch-panel">
        {props.leftValueLabel && (
          <span>
            {props.skipLeftTranslation
              ? props.leftValueLabel
              : chrome.i18n.getMessage(props.leftValueLabel)}
          </span>
        )}
        <label className="switch-control">
          <input
            type="checkbox"
            data-testid={`switch-${props.dataTestId}`}
            aria-label={
              props.leftValueLabel
                ? props.skipLeftTranslation
                  ? props.leftValueLabel
                  : chrome.i18n.getMessage(props.leftValueLabel)
                : props.rightValueLabel
                ? props.skipRightTranslation
                  ? props.rightValueLabel
                  : chrome.i18n.getMessage(props.rightValueLabel)
                : chrome.i18n.getMessage('popup_html_theme')
            }
            onChange={(e) =>
              props.onChange(
                e.target.checked ? props.rightValue : props.leftValue,
              )
            }
            checked={props.selectedValue === props.rightValue}
          />
          <span className="switch-track" aria-hidden="true" />
        </label>
        {props.rightValueLabel && (
          <span>
            {props.skipRightTranslation
              ? props.rightValueLabel
              : chrome.i18n.getMessage(props.rightValueLabel)}
          </span>
        )}
      </div>

      {props.hint && (
        <div className="hint">
          {props.skipHintTranslation
            ? props.hint
            : chrome.i18n.getMessage(props.hint)}
        </div>
      )}
    </div>
  );
};

export default SwitchComponent;
