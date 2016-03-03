'use strict';
const ServerConfig = require('../configs/server-config');
const Food = require('../models/food');

class FoodService {

    constructor(playerStatBoard, boardOccupancyService, nameService, sendNotificationToPlayers) {
        this.food = {};
        this.playerStatBoard = playerStatBoard;
        this.boardOccupancyService = boardOccupancyService;
        this.nameService = nameService;
        this.sendNotificationToPlayers = sendNotificationToPlayers;

        for (let i = 0; i < ServerConfig.FOOD.DEFAULT_AMOUNT; i++) {
            this.generateFood();
        }
    }

    consumeAndRespawnFood(players) {
        let foodToRespawn = 0;
        const foodsConsumed = this.boardOccupancyService.getFoodsConsumed();
        for (const foodConsumed of foodsConsumed) {
            const playerWhoConsumedFood = players[foodConsumed.playerId];
            const food = this.food[foodConsumed.foodId];
            playerWhoConsumedFood.grow(ServerConfig.FOOD[food.type].GROWTH);
            this.playerStatBoard.increaseScore(playerWhoConsumedFood.id, ServerConfig.FOOD[food.type].POINTS);

            if (food.type === ServerConfig.FOOD.SWAP.TYPE && Object.keys(players).length > 1) {
                const otherPlayer = this._getAnotherRandomPlayer(players, playerWhoConsumedFood.id);
                this.boardOccupancyService.removePlayerOccupancy(otherPlayer.id, otherPlayer.segments);
                this.boardOccupancyService.removePlayerOccupancy(playerWhoConsumedFood.id, playerWhoConsumedFood.segments);
                const otherPlayerDirection = otherPlayer.direction;
                const otherPlayerDirectionBeforeMove = otherPlayer.directionBeforeMove;
                const otherPlayerSegments = otherPlayer.segments;
                otherPlayer.moveCounter = 0;
                otherPlayer.direction = playerWhoConsumedFood.direction;
                otherPlayer.directionBeforeMove = playerWhoConsumedFood.directionBeforeMove;
                otherPlayer.segments = playerWhoConsumedFood.segments;
                playerWhoConsumedFood.moveCounter = 0;
                playerWhoConsumedFood.direction = otherPlayerDirection;
                playerWhoConsumedFood.directionBeforeMove = otherPlayerDirectionBeforeMove;
                playerWhoConsumedFood.segments = otherPlayerSegments;

                this.boardOccupancyService.addPlayerOccupancy(otherPlayer.id, otherPlayer.segments);
                this.boardOccupancyService.addPlayerOccupancy(playerWhoConsumedFood.id, playerWhoConsumedFood.segments);
            }

            this.removeFood(foodConsumed.foodId);
            foodToRespawn++;
        }

        for (let i = 0; i < foodToRespawn; i++) {
            this.generateFood();
        }
    }

    generateFood() {
        const randomUnoccupiedCoordinate = this.boardOccupancyService.getRandomUnoccupiedCoordinate();
        if (!randomUnoccupiedCoordinate) {
            this.sendNotificationToPlayers('Could not add more food.  No room left.', 'white');
            return;
        }
        const foodId = this.nameService.getFoodId();
        let food;
        if (Math.random() < ServerConfig.FOOD.GOLDEN.SPAWN_RATE) {
            food = new Food(foodId, randomUnoccupiedCoordinate, ServerConfig.FOOD.GOLDEN.TYPE, ServerConfig.FOOD.GOLDEN.COLOR);
        } else if (Math.random() < ServerConfig.FOOD.SWAP.SPAWN_RATE) {
            food = new Food(foodId, randomUnoccupiedCoordinate, ServerConfig.FOOD.SWAP.TYPE, ServerConfig.FOOD.SWAP.COLOR);
        } else if (Math.random() < ServerConfig.FOOD.SUPER.SPAWN_RATE) {
            food = new Food(foodId, randomUnoccupiedCoordinate, ServerConfig.FOOD.SUPER.TYPE, ServerConfig.FOOD.SUPER.COLOR);
        } else {
            food = new Food(foodId, randomUnoccupiedCoordinate, ServerConfig.FOOD.NORMAL.TYPE, ServerConfig.FOOD.NORMAL.COLOR);
        }
        this.food[foodId] = food;
        this.boardOccupancyService.addFoodOccupancy(food.id, food.location);
    }

    getFood() {
        return this.food;
    }

    getFoodAmount() {
        return Object.keys(this.food).length;
    }

    getLastFoodIdSpawned() {
        return this.food[Object.keys(this.food)[Object.keys(this.food).length - 1]].id;
    }

    removeFood(foodId) {
        const foodToRemove = this.food[foodId];
        this.nameService.returnFoodId(foodId);
        this.boardOccupancyService.removeFoodOccupancy(foodId, foodToRemove.location);
        delete this.food[foodId];
    }

    _getAnotherRandomPlayer(players, excludedPlayerId) {
        const playerIds = Object.keys(players);
        playerIds.splice(playerIds.indexOf(excludedPlayerId), 1);
        return players[playerIds[playerIds.length * Math.random() << 0]];
    }
}

module.exports = FoodService;