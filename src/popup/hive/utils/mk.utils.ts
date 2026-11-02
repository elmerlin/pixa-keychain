import AccountUtils from 'src/popup/hive/utils/account.utils';
import { isPasswordValid } from 'src/popup/hive/utils/password.utils';

const login = async (password: string): Promise<boolean> => {
  let accounts = await AccountUtils.getAccountsFromLocalStorage(password);
  return accounts ? true : false;
};

const MkUtils = {
  isPasswordValid,
  login,
};

export default MkUtils;
