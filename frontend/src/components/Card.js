import React from "react";

const Card = ({ name, suit }) => {
  const cardImage = require(`../assets/${name}_of_${suit}.png`);
  return <img src={cardImage} alt={`${name} of ${suit}`} className="card-image" />;
};

export default Card;