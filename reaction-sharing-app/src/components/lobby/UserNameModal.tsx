import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface UserNameModalProps {
  isOpen: boolean;
  onSubmit: (userName: string) => void;
  onClose: () => void;
  initialValue?: string;
}

export const UserNameModal: React.FC<UserNameModalProps> = ({
  isOpen,
  onSubmit,
  onClose,
  initialValue = '',
}) => {
  const [userName, setUserName] = useState(initialValue);
  const [error, setError] = useState('');

  useEffect(() => {
    setUserName(initialValue);
  }, [initialValue]);

  const validateUserName = (name: string): string => {
    if (!name.trim()) {
      return 'ユーザー名を入力してください';
    }
    if (name.length < 3) {
      return 'ユーザー名は3文字以上で入力してください';
    }
    if (name.length > 20) {
      return 'ユーザー名は20文字以下で入力してください';
    }
    if (!/^[a-zA-Z0-9あ-んア-ヶ一-龯\s]+$/.test(name)) {
      return 'ユーザー名には英数字、ひらがな、カタカナ、漢字のみ使用できます';
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = userName.trim();
    const validationError = validateUserName(trimmedName);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    onSubmit(trimmedName);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserName(value);

    if (error) {
      const validationError = validateUserName(value.trim());
      if (!validationError) {
        setError('');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ユーザー名を設定"
      size="sm"
      closeOnBackdrop={false}
      showCloseButton={!!initialValue}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
            ユーザー名
          </label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={handleInputChange}
            placeholder="あなたの名前を入力してください"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
            }`}
            autoFocus
            maxLength={20}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            3-20文字で入力してください（英数字、ひらがな、カタカナ、漢字）
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          {initialValue && (
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              キャンセル
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={!userName.trim() || !!error}
          >
            {initialValue ? '変更' : '参加'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};