import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Messages from './Messages';
import { messageAPI } from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  messageAPI: {
    getConversations: vi.fn(),
    getConversationMessages: vi.fn(),
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'user1',
      username: 'testuser',
      email: 'test@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    isAuthenticated: true,
    loading: false,
  }),
}));

// Mock scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Test wrapper
const TestWrapper = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('MessagesPage - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Conversations API call on mount
   * Validates: Requirements 9.1
   */
  it('should fetch conversations on mount', async () => {
    const mockConversations = {
      data: {
        data: [
          {
            _id: 'conv1',
            participants: [
              { _id: 'user1', username: 'testuser', avatarUrl: 'avatar1.jpg' },
              { _id: 'user2', username: 'otheruser', avatarUrl: 'avatar2.jpg' },
            ],
            lastMessage: {
              content: 'Hello there',
              timestamp: new Date().toISOString(),
            },
            lastMessageAt: new Date().toISOString(),
          },
        ],
      },
    };

    messageAPI.getConversations.mockResolvedValue(mockConversations);

    render(
      <TestWrapper>
        <Messages />
      </TestWrapper>
    );

    // Wait for API call
    await waitFor(() => {
      expect(messageAPI.getConversations).toHaveBeenCalled();
    });

    // Should display the conversation
    await waitFor(() => {
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });
  });

  /**
   * Test: Conversation selection
   * Validates: Requirements 9.4
   */
  it('should display message thread when conversation is selected', async () => {
    const mockConversations = {
      data: {
        data: [
          {
            _id: 'conv1',
            participants: [
              { _id: 'user1', username: 'testuser', avatarUrl: 'avatar1.jpg' },
              { _id: 'user2', username: 'otheruser', avatarUrl: 'avatar2.jpg' },
            ],
            lastMessage: {
              content: 'Hello there',
              timestamp: new Date().toISOString(),
            },
            lastMessageAt: new Date().toISOString(),
          },
        ],
      },
    };

    const mockMessages = {
      data: {
        data: [
          {
            _id: 'msg1',
            conversationId: 'conv1',
            senderId: {
              _id: 'user2',
              username: 'otheruser',
              avatarUrl: 'avatar2.jpg',
            },
            content: 'Hello there',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };

    messageAPI.getConversations.mockResolvedValue(mockConversations);
    messageAPI.getConversationMessages.mockResolvedValue(mockMessages);

    render(
      <TestWrapper>
        <Messages />
      </TestWrapper>
    );

    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });

    // Click on the conversation
    fireEvent.click(screen.getByText('otheruser'));

    // Should call getConversationMessages API
    await waitFor(() => {
      expect(messageAPI.getConversationMessages).toHaveBeenCalledWith('conv1');
    });
  });

  /**
   * Test: Message thread display
   * Validates: Requirements 9.5, 9.6, 9.7
   */
  it('should display messages with sender info', async () => {
    const mockConversations = {
      data: {
        data: [
          {
            _id: 'conv1',
            participants: [
              { _id: 'user1', username: 'testuser', avatarUrl: 'avatar1.jpg' },
              { _id: 'user2', username: 'otheruser', avatarUrl: 'avatar2.jpg' },
            ],
            lastMessage: {
              content: 'Latest message',
              timestamp: new Date().toISOString(),
            },
            lastMessageAt: new Date().toISOString(),
          },
        ],
      },
    };

    const mockMessages = {
      data: {
        data: [
          {
            _id: 'msg1',
            conversationId: 'conv1',
            senderId: {
              _id: 'user2',
              username: 'otheruser',
              avatarUrl: 'avatar2.jpg',
            },
            content: 'First message',
            timestamp: new Date().toISOString(),
          },
          {
            _id: 'msg2',
            conversationId: 'conv1',
            senderId: {
              _id: 'user1',
              username: 'testuser',
              avatarUrl: 'avatar1.jpg',
            },
            content: 'Second message',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };

    messageAPI.getConversations.mockResolvedValue(mockConversations);
    messageAPI.getConversationMessages.mockResolvedValue(mockMessages);

    render(
      <TestWrapper>
        <Messages />
      </TestWrapper>
    );

    // Wait and click conversation
    await waitFor(() => {
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('otheruser'));

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });

    // Should display "You" for own messages
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  /**
   * Test: Send message
   * Validates: Requirements 9.8, 9.9
   */
  it('should send message and clear input', async () => {
    const mockConversations = {
      data: {
        data: [
          {
            _id: 'conv1',
            participants: [
              { _id: 'user1', username: 'testuser', avatarUrl: 'avatar1.jpg' },
              { _id: 'user2', username: 'otheruser', avatarUrl: 'avatar2.jpg' },
            ],
            lastMessage: {
              content: 'Hello',
              timestamp: new Date().toISOString(),
            },
            lastMessageAt: new Date().toISOString(),
          },
        ],
      },
    };

    const mockMessages = {
      data: {
        data: [
          {
            _id: 'msg1',
            conversationId: 'conv1',
            senderId: {
              _id: 'user2',
              username: 'otheruser',
              avatarUrl: 'avatar2.jpg',
            },
            content: 'Hello',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };

    const mockNewMessage = {
      data: {
        data: {
          _id: 'msg2',
          conversationId: 'conv1',
          senderId: {
            _id: 'user1',
            username: 'testuser',
            avatarUrl: 'avatar1.jpg',
          },
          content: 'Test message',
          timestamp: new Date().toISOString(),
        },
      },
    };

    messageAPI.getConversations.mockResolvedValue(mockConversations);
    messageAPI.getConversationMessages.mockResolvedValue(mockMessages);
    messageAPI.sendMessage.mockResolvedValue(mockNewMessage);

    render(
      <TestWrapper>
        <Messages />
      </TestWrapper>
    );

    // Wait and select conversation
    await waitFor(() => {
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('otheruser'));

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    // Type and send message
    const messageInput = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByRole('button', { name: '' });
    fireEvent.click(sendButton);

    // Should call sendMessage API
    await waitFor(() => {
      expect(messageAPI.sendMessage).toHaveBeenCalledWith('conv1', 'Test message');
    });

    // Input should be cleared
    expect(messageInput.value).toBe('');
  });

  /**
   * Test: Loading state display
   * Validates: Requirements 9.13
   */
  it('should display loading spinner during API requests', async () => {
    messageAPI.getConversations.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { data: [] } }), 100))
    );

    render(
      <TestWrapper>
        <Messages />
      </TestWrapper>
    );

    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  /**
   * Test: Error state display
   * Validates: Requirements 9.15
   */
  it('should display error message on API failure', async () => {
    const errorMessage = 'Failed to fetch conversations';
    messageAPI.getConversations.mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    });

    render(
      <TestWrapper>
        <Messages />
      </TestWrapper>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  /**
   * Test: Empty state display
   * Validates: Requirements 9.14
   */
  it('should display "No conversations" message when empty', async () => {
    const mockConversations = {
      data: {
        data: [],
      },
    };

    messageAPI.getConversations.mockResolvedValue(mockConversations);

    render(
      <TestWrapper>
        <Messages />
      </TestWrapper>
    );

    // Wait for empty state to be displayed
    await waitFor(() => {
      expect(screen.getByText('No conversations')).toBeInTheDocument();
    });

    expect(screen.getByText('Start a new conversation to get started')).toBeInTheDocument();
  });
});
