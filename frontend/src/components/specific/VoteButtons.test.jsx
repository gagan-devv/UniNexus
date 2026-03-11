import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VoteButtons from './VoteButtons';

describe('VoteButtons', () => {
  const mockOnVote = vi.fn();
  const defaultProps = {
    commentId: 'comment123',
    voteCount: 0,
    userVote: null,
    onVote: mockOnVote,
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render upvote and downvote buttons', () => {
      render(<VoteButtons {...defaultProps} />);
      
      expect(screen.getByLabelText('Upvote')).toBeInTheDocument();
      expect(screen.getByLabelText('Downvote')).toBeInTheDocument();
    });

    it('should display vote count', () => {
      render(<VoteButtons {...defaultProps} voteCount={5} />);
      
      expect(screen.getByLabelText('Vote count: 5')).toHaveTextContent('5');
    });

    it('should display zero vote count', () => {
      render(<VoteButtons {...defaultProps} voteCount={0} />);
      
      expect(screen.getByLabelText('Vote count: 0')).toHaveTextContent('0');
    });

    it('should display negative vote count', () => {
      render(<VoteButtons {...defaultProps} voteCount={-3} />);
      
      expect(screen.getByLabelText('Vote count: -3')).toHaveTextContent('-3');
    });
  });

  describe('Vote Highlighting', () => {
    it('should highlight upvote button when user has upvoted', () => {
      render(<VoteButtons {...defaultProps} userVote="upvote" />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      expect(upvoteButton).toHaveClass('text-orange-500');
    });

    it('should highlight downvote button when user has downvoted', () => {
      render(<VoteButtons {...defaultProps} userVote="downvote" />);
      
      const downvoteButton = screen.getByLabelText('Downvote');
      expect(downvoteButton).toHaveClass('text-blue-500');
    });

    it('should not highlight any button when user has not voted', () => {
      render(<VoteButtons {...defaultProps} userVote={null} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      const downvoteButton = screen.getByLabelText('Downvote');
      
      expect(upvoteButton).not.toHaveClass('text-orange-500');
      expect(downvoteButton).not.toHaveClass('text-blue-500');
    });
  });

  describe('Vote Count Styling', () => {
    it('should style positive vote count in orange', () => {
      render(<VoteButtons {...defaultProps} voteCount={5} />);
      
      const voteCount = screen.getByLabelText('Vote count: 5');
      expect(voteCount).toHaveClass('text-orange-500');
    });

    it('should style negative vote count in blue', () => {
      render(<VoteButtons {...defaultProps} voteCount={-3} />);
      
      const voteCount = screen.getByLabelText('Vote count: -3');
      expect(voteCount).toHaveClass('text-blue-500');
    });

    it('should style zero vote count in gray', () => {
      render(<VoteButtons {...defaultProps} voteCount={0} />);
      
      const voteCount = screen.getByLabelText('Vote count: 0');
      expect(voteCount).toHaveClass('text-gray-600');
    });
  });

  describe('Voting Interactions', () => {
    it('should call onVote with upvote when upvote button is clicked', () => {
      render(<VoteButtons {...defaultProps} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('comment123', 'upvote');
    });

    it('should call onVote with downvote when downvote button is clicked', () => {
      render(<VoteButtons {...defaultProps} />);
      
      const downvoteButton = screen.getByLabelText('Downvote');
      fireEvent.click(downvoteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('comment123', 'downvote');
    });

    it('should call onVote with remove when upvote button is clicked and user has already upvoted', () => {
      render(<VoteButtons {...defaultProps} userVote="upvote" />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('comment123', 'remove');
    });

    it('should call onVote with remove when downvote button is clicked and user has already downvoted', () => {
      render(<VoteButtons {...defaultProps} userVote="downvote" />);
      
      const downvoteButton = screen.getByLabelText('Downvote');
      fireEvent.click(downvoteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('comment123', 'remove');
    });

    it('should switch from upvote to downvote when downvote is clicked', () => {
      render(<VoteButtons {...defaultProps} userVote="upvote" />);
      
      const downvoteButton = screen.getByLabelText('Downvote');
      fireEvent.click(downvoteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('comment123', 'downvote');
    });

    it('should switch from downvote to upvote when upvote is clicked', () => {
      render(<VoteButtons {...defaultProps} userVote="downvote" />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('comment123', 'upvote');
    });
  });

  describe('Disabled State', () => {
    it('should disable buttons when disabled prop is true', () => {
      render(<VoteButtons {...defaultProps} disabled={true} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      const downvoteButton = screen.getByLabelText('Downvote');
      
      expect(upvoteButton).toBeDisabled();
      expect(downvoteButton).toBeDisabled();
    });

    it('should not call onVote when disabled button is clicked', () => {
      render(<VoteButtons {...defaultProps} disabled={true} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);
      
      expect(mockOnVote).not.toHaveBeenCalled();
    });

    it('should show login tooltip when disabled', () => {
      render(<VoteButtons {...defaultProps} disabled={true} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      expect(upvoteButton).toHaveAttribute('title', 'Login to vote');
    });

    it('should show vote tooltip when enabled', () => {
      render(<VoteButtons {...defaultProps} disabled={false} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      expect(upvoteButton).toHaveAttribute('title', 'Upvote');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when onVote fails', async () => {
      const errorMessage = 'Failed to vote';
      mockOnVote.mockRejectedValue({
        response: { data: { message: errorMessage } },
      });

      render(<VoteButtons {...defaultProps} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display generic error message when onVote fails without message', async () => {
      mockOnVote.mockRejectedValue(new Error('Network error'));

      render(<VoteButtons {...defaultProps} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to vote')).toBeInTheDocument();
      });
    });

    it('should clear error after successful vote', async () => {
      mockOnVote.mockResolvedValue({});

      render(<VoteButtons {...defaultProps} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels for buttons', () => {
      render(<VoteButtons {...defaultProps} />);
      
      expect(screen.getByLabelText('Upvote')).toBeInTheDocument();
      expect(screen.getByLabelText('Downvote')).toBeInTheDocument();
    });

    it('should have proper aria-label for vote count', () => {
      render(<VoteButtons {...defaultProps} voteCount={10} />);
      
      expect(screen.getByLabelText('Vote count: 10')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<VoteButtons {...defaultProps} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      upvoteButton.focus();
      
      expect(document.activeElement).toBe(upvoteButton);
    });
  });
});
