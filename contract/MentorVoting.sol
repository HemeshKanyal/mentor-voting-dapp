// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MentorVoting {
    enum PollType { Agreement, Quiz }

    struct Poll {
        string question;
        string[] options;
        uint256[] votes;
        uint256 endTime;
        address creator;
        PollType pollType;
        uint256 correctOption; // for Quiz polls
        address firstCorrectVoter; // winner in Quiz polls
        bool hasCorrect; // true if a correct answer is set
        mapping(address => bool) voted;
    }

    uint256 public pollCount;
    mapping(uint256 => Poll) private polls;

    event PollCreated(
        uint256 indexed pollId,
        string question,
        string[] options,
        uint256 endTime,
        PollType pollType
    );

    event Voted(
        uint256 indexed pollId,
        uint256 optionIndex,
        address voter
    );

    event WinnerDeclared(
        uint256 indexed pollId,
        string winnerOption,
        address winnerAddress,
        uint256 votes
    );

    // ✅ Create a new poll
    function createPoll(
        string memory _question,
        string[] memory _options,
        uint256 _durationInSeconds,
        uint8 _pollType,
        uint256 _correctOption // only valid if Quiz
    ) public {
        require(_options.length >= 2, "Need at least 2 options");
        require(_pollType <= uint8(PollType.Quiz), "Invalid poll type");

        pollCount++;
        Poll storage newPoll = polls[pollCount];
        newPoll.question = _question;
        newPoll.creator = msg.sender;
        newPoll.endTime = block.timestamp + _durationInSeconds;
        newPoll.pollType = PollType(_pollType);

        for (uint i = 0; i < _options.length; i++) {
            newPoll.options.push(_options[i]);
            newPoll.votes.push(0);
        }

        if (_pollType == uint8(PollType.Quiz)) {
            require(_correctOption < _options.length, "Invalid correct option");
            newPoll.correctOption = _correctOption;
            newPoll.hasCorrect = true;
        }

        emit PollCreated(pollCount, _question, _options, newPoll.endTime, newPoll.pollType);
    }

    // ✅ Cast a vote
    function vote(uint256 _pollId, uint256 _optionIndex) public {
        Poll storage poll = polls[_pollId];
        require(block.timestamp < poll.endTime, "Poll ended");
        require(!poll.voted[msg.sender], "Already voted");
        require(_optionIndex < poll.options.length, "Invalid option");

        poll.votes[_optionIndex]++;
        poll.voted[msg.sender] = true;

        // 🎯 Special logic for Quiz poll
        if (
            poll.pollType == PollType.Quiz &&
            poll.hasCorrect &&
            _optionIndex == poll.correctOption &&
            poll.firstCorrectVoter == address(0)
        ) {
            poll.firstCorrectVoter = msg.sender; // first correct voter
        }

        emit Voted(_pollId, _optionIndex, msg.sender);
    }

    // ✅ Get poll details
    function getPoll(uint256 _pollId) public view returns (
        string memory,
        string[] memory,
        uint256[] memory,
        uint256,
        PollType,
        address,
        bool
    ) {
        Poll storage poll = polls[_pollId];
        return (
            poll.question,
            poll.options,
            poll.votes,
            poll.endTime,
            poll.pollType,
            poll.creator,
            poll.hasCorrect
        );
    }

    // ✅ Get winner (after poll ends)
    function getWinner(uint256 _pollId) public view returns (string memory winner, address winnerAddress, uint256 votes) {
        Poll storage poll = polls[_pollId];
        require(block.timestamp >= poll.endTime, "Poll still running");

        if (poll.pollType == PollType.Agreement) {
            // 📊 Winner = most votes
            uint256 highestVotes = 0;
            uint256 winnerIndex = 0;
            for (uint i = 0; i < poll.votes.length; i++) {
                if (poll.votes[i] > highestVotes) {
                    highestVotes = poll.votes[i];
                    winnerIndex = i;
                }
            }
            return (poll.options[winnerIndex], address(0), highestVotes);
        } else {
            // 🎯 Quiz: first correct voter wins
            if (poll.firstCorrectVoter != address(0)) {
                return (poll.options[poll.correctOption], poll.firstCorrectVoter, 1);
            } else {
                return ("No correct answer", address(0), 0);
            }
        }
    }
}
