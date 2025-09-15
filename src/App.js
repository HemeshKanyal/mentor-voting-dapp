import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import "./App.css";

// Contract details
const contractAddress = "0x85CbbaF6AC0A7565540f7aF9082e419816689C00";
const contractABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "question",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string[]",
				"name": "options",
				"type": "string[]"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "endTime",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum MentorVoting.PollType",
				"name": "pollType",
				"type": "uint8"
			}
		],
		"name": "PollCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "optionIndex",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "voter",
				"type": "address"
			}
		],
		"name": "Voted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "pollId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "winnerOption",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "winnerAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "votes",
				"type": "uint256"
			}
		],
		"name": "WinnerDeclared",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_question",
				"type": "string"
			},
			{
				"internalType": "string[]",
				"name": "_options",
				"type": "string[]"
			},
			{
				"internalType": "uint256",
				"name": "_durationInSeconds",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "_pollType",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "_correctOption",
				"type": "uint256"
			}
		],
		"name": "createPoll",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_optionIndex",
				"type": "uint256"
			}
		],
		"name": "vote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "getPoll",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			},
			{
				"internalType": "string[]",
				"name": "",
				"type": "string[]"
			},
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "enum MentorVoting.PollType",
				"name": "",
				"type": "uint8"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_pollId",
				"type": "uint256"
			}
		],
		"name": "getWinner",
		"outputs": [
			{
				"internalType": "string",
				"name": "winner",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "winnerAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "votes",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "pollCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [pollId, setPollId] = useState("");
  const [pollDetails, setPollDetails] = useState(null);
  const [shareLink, setShareLink] = useState("");

  // New poll form
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  const [duration, setDuration] = useState(60);
  const [pollType, setPollType] = useState(0);
  const [correctOption, setCorrectOption] = useState(0);

  // Connect wallet
  async function connectWallet() {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAccount(addr);

      const c = new ethers.Contract(contractAddress, contractABI, signer);
      setContract(c);

      const count = await c.pollCount();
      setPollCount(Number(count));
    } else {
      alert("Install MetaMask!");
    }
  }

  // Create new poll
  async function createPoll() {
    if (!contract) return;
    const opts = options.split(",").map((o) => o.trim());
    const tx = await contract.createPoll(
      question,
      opts,
      duration,
      pollType,
      correctOption
    );
    const receipt = await tx.wait();

    // Capture pollId from event logs
    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((e) => e && e.name === "PollCreated")[0];

    if (event) {
      const newPollId = event.args.pollId.toString();
      const link = `${window.location.origin}/?pollId=${newPollId}`;
      setShareLink(link);
      setPollId(newPollId);
      alert("Poll created!");
    }
  }

  // Fetch poll
  const getPoll = useCallback(async () => {
    if (!contract || !pollId) return;
    try {
      const data = await contract.getPoll(pollId);
      setPollDetails(data);
    } catch (err) {
      console.error("Error fetching poll:", err);
      setPollDetails(null);
      alert("Poll not found or invalid ID.");
    }
  }, [contract, pollId]);

  // Vote
  async function vote(optionIndex) {
    if (!contract) return;
    const tx = await contract.vote(pollId, optionIndex);
    await tx.wait();
    alert("Voted!");
  }

  // Winner
  async function getWinner() {
    if (!contract) return;
    const winner = await contract.getWinner(pollId);
    alert(`Winner: ${winner[0]}, Address: ${winner[1]}, Votes: ${winner[2]}`);
  }

  // ✅ Load pollId from URL on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("pollId");
    if (idFromUrl) {
      setPollId(idFromUrl);
    }
  }, []);

  // ✅ Fetch poll whenever contract or pollId changes
  useEffect(() => {
    if (contract && pollId) {
      getPoll();
    }
  }, [contract, pollId, getPoll]);

  // ✅ Event listeners for live updates
  useEffect(() => {
    if (!contract) return;

    const onPollCreated = async (id) => {
      const count = await contract.pollCount();
      setPollCount(Number(count));

      const newPollId = Number(id);
      setPollId(newPollId.toString());
      const data = await contract.getPoll(newPollId);
      setPollDetails(data);
    };

    const onVoted = async (id) => {
      if (pollId && Number(id) === Number(pollId)) {
        const data = await contract.getPoll(pollId);
        setPollDetails(data);
      }
    };
    

    contract.on("PollCreated", onPollCreated);
    contract.on("Voted", onVoted);

    return () => {
      contract.removeAllListeners("PollCreated");
      contract.removeAllListeners("Voted");
    };
  }, [contract, pollId]);

  return (
    <div className="App">
      <h1>🗳 Mentor Voting DApp</h1>

      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>Connected: {account}</p>
      )}
      <p><b>Total Polls Created:</b> {pollCount}</p>

      <h2>Create Poll</h2>
      <input
        placeholder="Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <input
        placeholder="Options (comma separated)"
        value={options}
        onChange={(e) => setOptions(e.target.value)}
      />
      <input
        placeholder="Duration in seconds"
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      <select
        value={pollType}
        onChange={(e) => setPollType(Number(e.target.value))}
      >
        <option value={0}>Agreement</option>
        <option value={1}>Quiz</option>
      </select>
      {pollType === 1 && (
        <input
          placeholder="Correct Option Index"
          type="number"
          value={correctOption}
          onChange={(e) => setCorrectOption(e.target.value)}
        />
      )}
      <button onClick={createPoll}>Create Poll</button>

      {shareLink && (
        <div>
          <p>✅ Share this poll link:</p>
          <input type="text" value={shareLink} readOnly style={{ width: "80%" }} />
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              alert("Link copied to clipboard!");
            }}
          >
            Copy Link
          </button>
        </div>
      )}

      <h2>Fetch Poll</h2>
      <input
        placeholder="Poll ID"
        value={pollId}
        onChange={(e) => setPollId(e.target.value)}
      />
      <button onClick={getPoll}>Get Poll</button>

      {pollDetails && (
  <div className="poll-card">
    <h3>{pollDetails[0]}</h3>
    <p className="poll-status">
      Status:{" "}
      {Date.now() < Number(pollDetails[3]) * 1000 ? (
        <span className="poll-active">Poll Active ✅</span>
      ) : (
        <span className="poll-closed">Poll Closed ❌</span>
      )}
    </p>

    <p><b>Options:</b></p>
    <ul>
      {pollDetails[1].map((opt, i) => (
        <li key={i}>
          {opt} ({pollDetails[2][i].toString()} votes){" "}
          <button
            onClick={() => vote(i)}
            disabled={Date.now() > Number(pollDetails[3]) * 1000}
          >
            Vote
          </button>
        </li>
      ))}
    </ul>

    <p><b>Ends At:</b> {new Date(Number(pollDetails[3]) * 1000).toLocaleString()}</p>
    <p><b>Type:</b> {Number(pollDetails[4]) === 0 ? "Agreement" : "Quiz"}</p>
    <button
      onClick={getWinner}
      disabled={Date.now() < Number(pollDetails[3]) * 1000}
    >
      Get Winner
    </button>
  </div>
)}

    </div>
  );
}

export default App;