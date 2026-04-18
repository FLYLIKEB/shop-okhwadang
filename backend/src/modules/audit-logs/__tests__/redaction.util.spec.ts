import { redactSensitiveFields, SENSITIVE_FIELDS } from '../../../common/utils/redaction.util';

describe('redactSensitiveFields', () => {
  it('should return null for null input', () => {
    expect(redactSensitiveFields(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(redactSensitiveFields(undefined)).toBeNull();
  });

  it('should return empty object for empty object input', () => {
    expect(redactSensitiveFields({})).toEqual({});
  });

  it('should not redact non-sensitive fields', () => {
    const input = { name: 'John', email: 'john@example.com', id: 123 };
    const result = redactSensitiveFields(input);
    expect(result).toEqual(input);
  });

  it('should redact password field', () => {
    const input = { email: 'john@example.com', password: 'secret123' };
    const result = redactSensitiveFields(input);
    expect(result).toEqual({ email: 'john@example.com', password: '[REDACTED]' });
  });

  it('should redact nested sensitive fields', () => {
    const input = { user: { name: 'John', password: 'secret123' } };
    const result = redactSensitiveFields(input);
    expect(result).toEqual({ user: { name: 'John', password: '[REDACTED]' } });
  });

  it('should redact token field', () => {
    const input = { token: 'jwt-token-here', name: 'John' };
    const result = redactSensitiveFields(input);
    expect(result).toEqual({ token: '[REDACTED]', name: 'John' });
  });

  it('should redact refreshtoken field', () => {
    const input = { email: 'john@example.com', refreshtoken: 'refresh-token-here' };
    const result = redactSensitiveFields(input);
    expect(result).toEqual({ email: 'john@example.com', refreshtoken: '[REDACTED]' });
  });

  it('should redact creditcard field', () => {
    const input = { amount: 100, creditcard: '4111111111111111' };
    const result = redactSensitiveFields(input);
    expect(result).toEqual({ amount: 100, creditcard: '[REDACTED]' });
  });

  it('should handle partial field name matches', () => {
    const input = { user_password: 'secret', password_hash: 'hash123' };
    const result = redactSensitiveFields(input);
    expect(result).toEqual({ user_password: '[REDACTED]', password_hash: '[REDACTED]' });
  });

  it('should not recurse into arrays', () => {
    const input = { users: [{ name: 'John', password: 'secret' }] };
    const result = redactSensitiveFields(input);
    expect(result).toEqual({ users: [{ name: 'John', password: 'secret' }] });
  });

  it('should handle mixed sensitive and non-sensitive fields', () => {
    const input = {
      id: 1,
      name: 'John',
      email: 'john@example.com',
      password: 'secret',
      token: 'jwt-token',
    };
    const result = redactSensitiveFields(input);
    expect(result).toEqual({
      id: 1,
      name: 'John',
      email: 'john@example.com',
      password: '[REDACTED]',
      token: '[REDACTED]',
    });
  });
});

describe('SENSITIVE_FIELDS constant', () => {
  it('should contain expected sensitive field names', () => {
    expect(SENSITIVE_FIELDS).toContain('password');
    expect(SENSITIVE_FIELDS).toContain('token');
    expect(SENSITIVE_FIELDS).toContain('refreshtoken');
    expect(SENSITIVE_FIELDS).toContain('creditcard');
    expect(SENSITIVE_FIELDS).toContain('ssn');
  });
});