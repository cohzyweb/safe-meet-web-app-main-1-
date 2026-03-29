// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SafeMeetEscrow
/// @notice Minimal escrow for SafeMeet P2P trades and goal pacts on Base Sepolia
contract SafeMeetEscrow {
    enum State { Locked, Released, Refunded }

    struct Escrow {
        address creator;
        address counterparty;
        uint256 amount;
        State   state;
    }

    mapping(bytes32 => Escrow) public escrows;

    event FundsLocked(bytes32 indexed pactId, address indexed creator, address indexed counterparty, uint256 amount);
    event FundsReleased(bytes32 indexed pactId, address indexed to, uint256 amount);
    event FundsRefunded(bytes32 indexed pactId, address indexed to, uint256 amount);

    /// @notice Lock ETH for a pact. Called by the trade creator.
    function lockFunds(bytes32 pactId, address counterparty) external payable {
        require(msg.value > 0, "Amount must be > 0");
        require(counterparty != address(0), "Invalid counterparty");
        require(escrows[pactId].creator == address(0), "Pact already exists");

        escrows[pactId] = Escrow({
            creator:      msg.sender,
            counterparty: counterparty,
            amount:       msg.value,
            state:        State.Locked
        });

        emit FundsLocked(pactId, msg.sender, counterparty, msg.value);
    }

    /// @notice Release locked funds to counterparty. Called by creator after successful trade.
    function releaseFunds(bytes32 pactId) external {
        Escrow storage e = escrows[pactId];
        require(e.creator == msg.sender, "Only creator");
        require(e.state == State.Locked, "Not locked");

        e.state = State.Released;
        payable(e.counterparty).transfer(e.amount);

        emit FundsReleased(pactId, e.counterparty, e.amount);
    }

    /// @notice Refund locked funds back to creator. Called by creator to cancel.
    function refund(bytes32 pactId) external {
        Escrow storage e = escrows[pactId];
        require(e.creator == msg.sender, "Only creator");
        require(e.state == State.Locked, "Not locked");

        e.state = State.Refunded;
        payable(e.creator).transfer(e.amount);

        emit FundsRefunded(pactId, e.creator, e.amount);
    }
}
