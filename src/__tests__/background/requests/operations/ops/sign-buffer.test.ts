import { signBuffer } from '@background/requests/operations/ops/sign-buffer';
import { RequestsHandler } from '@background/requests/request-handler';
import { KeysUtils } from 'src/popup/hive/utils/keys.utils';
import { DialogCommand } from '@reference-data/dialog-message-key.enum';
import {
  KeychainKeyTypes,
  KeychainRequestTypes,
  RequestId,
  RequestSignBuffer,
} from 'hive-keychain-commons';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import userData from 'src/__tests__/utils-for-testing/data/user-data';
import mocksImplementation from 'src/__tests__/utils-for-testing/implementations/implementations';
import { KeychainError } from 'src/keychain-error';

const { Signature } = require('@hiveio/hive-js/lib/auth/ecc');
const signText = (message: string, key: string) =>
  Signature.signBuffer(message, key).toHex();

describe('sign-buffer tests:\n', () => {
  const data = {
    domain: 'domain',
    type: KeychainRequestTypes.signBuffer,
    username: mk.user.one,
    message: '',
    method: KeychainKeyTypes.active,
    title: 'title',
  } as RequestSignBuffer & RequestId;

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });
  beforeEach(() => {
    jest.spyOn(chrome.i18n, 'getUILanguage').mockReturnValueOnce('en-US');
    chrome.i18n.getMessage = jest
      .fn()
      .mockImplementation(mocksImplementation.i18nGetMessageCustom);
  });

  it('Must call getUserKey', async () => {
    const requestHandler = new RequestsHandler();
    const sGetUserKeyPair = jest.spyOn(requestHandler, 'getUserKeyPair');
    await signBuffer(requestHandler, data);
    expect(sGetUserKeyPair).toHaveBeenCalledWith(
      data.username!,
      data.method.toLowerCase(),
    );
  });

  it('Must return success on string', async () => {
    const requestHandler = new RequestsHandler();
    requestHandler.data.key = userData.one.nonEncryptKeys.active;
    data.message = 'the key is very importat on PIXA';
    const signed = await signBuffer(requestHandler, data);
    const { request_id, ...datas } = data;
    const expectedHex = signText(
      data.message,
      userData.one.nonEncryptKeys.active,
    );
    expect(signed).toEqual({
      command: DialogCommand.ANSWER_REQUEST,
      msg: {
        success: true,
        error: null,
        result: expectedHex,
        data: datas,
        message: chrome.i18n.getMessage('bgd_ops_sign_success'),
        request_id: request_id,
        publicKey: undefined,
      },
    });
  });

  it('Signs bytes wrapped in JSON as the text it reads, not as bytes', async () => {
    const requestHandler = new RequestsHandler();
    requestHandler.data.key = userData.one.nonEncryptKeys.active;
    const _buffer = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
    data.message = JSON.stringify(_buffer);
    const signed = await signBuffer(requestHandler, data);
    const { request_id, ...datas } = data;
    const expectedBufferHex = signText(
      data.message,
      userData.one.nonEncryptKeys.active,
    );
    expect(signed).toEqual({
      command: DialogCommand.ANSWER_REQUEST,
      msg: {
        success: true,
        error: null,
        result: expectedBufferHex,
        data: datas,
        message: chrome.i18n.getMessage('bgd_ops_sign_success'),
        request_id: request_id,
        publicKey: undefined,
      },
    });
  });

  describe('Hiding a transaction in a message', () => {
    const chainId = Buffer.from(
      '706978616772616d000000000000000000000000000000000000000000000000',
      'hex',
    );
    const bytes = [...chainId, 1, 2, 3];

    it('Refuses text that starts with the chain ID', async () => {
      const requestHandler = new RequestsHandler();
      requestHandler.data.key = userData.one.nonEncryptKeys.active;
      const signed = await signBuffer(requestHandler, {
        ...data,
        message: Buffer.from(bytes).toString(),
      });
      expect(signed.msg.success).toBe(false);
      expect(signed.msg.result).toBeNull();
    });

    it.each([
      ['alone', JSON.stringify({ type: 'Buffer', data: bytes })],
      [
        'behind a notice',
        JSON.stringify({
          notice: 'Sign in to this site',
          type: 'Buffer',
          data: bytes,
        }),
      ],
    ])('Never signs the bytes of a Buffer %s', async (_, message) => {
      const requestHandler = new RequestsHandler();
      requestHandler.data.key = userData.one.nonEncryptKeys.active;
      const signed = await signBuffer(requestHandler, { ...data, message });
      expect(signed.msg.result).toBe(
        signText(message, userData.one.nonEncryptKeys.active),
      );
      expect(signed.msg.result).not.toBe(
        Signature.signBuffer(
          Buffer.from(bytes),
          userData.one.nonEncryptKeys.active,
        ).toHex(),
      );
    });
  });

  it('Must return error if no key on handler', async () => {
    const requestHandler = new RequestsHandler();
    requestHandler.getUserKeyPair = jest.fn().mockReturnValue([]);
    const signed = await signBuffer(requestHandler, data);
    const { request_id, ...datas } = data;
    expect(signed).toEqual({
      command: DialogCommand.ANSWER_REQUEST,
      msg: {
        success: false,
        error: expect.objectContaining({
          message: 'private_key required',
        }),
        result: null,
        data: datas,
        message: chrome.i18n.getMessage('private_key required'),
        request_id: request_id,
        publicKey: undefined,
      },
    });
  });
});
