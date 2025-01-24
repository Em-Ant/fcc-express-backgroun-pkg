import { Address4, Address6 } from 'ip-address'

const v4Address = new Address4('223.105.144.76')
const v6Address = new Address6('9489:606d:cb1c:e4bc:a96d:dd46:41a3:4f7b')
const isVersion4 = v4Address.isCorrect()
const isVersion6 = v6Address.isCorrect()

console.log(isVersion4 === true)
console.log(isVersion6 === true)
